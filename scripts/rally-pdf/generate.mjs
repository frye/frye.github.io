import { mkdtemp, readFile, rename, rm, rmdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../../", import.meta.url));
const sourcePath = join(root, "sea-scout-rally-rules/index.html");
const outputPath = join(root, "sea-scout-rally-rules/sea-scout-rally-rules.pdf");
const printStylesheet = "/assets/sea-scout-rally-rules-print.css";

async function generate() {
  const html = await readFile(sourcePath, "utf8");
  const browser = await chromium.launch();
  let temporaryDirectory;

  try {
    const page = await browser.newPage({
      javaScriptEnabled: false,
      serviceWorkers: "block",
    });
    // Only local styles are embedded below; rendering never fetches remote assets.
    await page.route("**/*", route => route.abort());
    await page.emulateMedia({ media: "print" });
    await page.setContent(html, { waitUntil: "load" });

    if (
      (await page.locator("main > article").count()) !== 1 ||
      (await page.locator("main > article > h1#rules-title").count()) !== 1 ||
      (await page.locator("main > article > section").count()) === 0
    ) {
      throw new Error("The rules page must contain one titled article with rule sections.");
    }

    const stylesheets = await page.locator('link[rel="stylesheet"]').evaluateAll(links =>
      links.map(link => ({
        href: link.getAttribute("href"),
        media: link.media || "all",
      })),
    );
    if (!stylesheets.some(({ href }) => href === printStylesheet)) {
      throw new Error(`The rules page must link ${printStylesheet}.`);
    }

    await page.locator('link[rel="stylesheet"]').evaluateAll(links =>
      links.forEach(link => link.remove()),
    );
    for (const { href, media } of stylesheets) {
      if (href?.startsWith("https://fonts.googleapis.com/")) {
        continue;
      }
      if (!href?.startsWith("/assets/")) {
        throw new Error(`Unsupported stylesheet URL: ${href}. Use local /assets/ styles.`);
      }
      const stylesheetPath = resolve(root, `.${href}`);
      if (relative(root, stylesheetPath).startsWith("..")) {
        throw new Error(`Stylesheet is outside the repository: ${href}`);
      }
      const content = await readFile(stylesheetPath, "utf8");
      await page.evaluate(({ content, media }) => {
        const style = document.createElement("style");
        style.media = media;
        style.textContent = content;
        document.head.append(style);
      }, { content, media });
    }

    await page.evaluate(() => document.fonts.ready);
    const title = await page.locator("#rules-title").innerText();
    await page.evaluate(value => { document.title = value; }, title);

    temporaryDirectory = await mkdtemp(join(dirname(outputPath), ".rally-pdf-"));
    const temporaryPDF = join(temporaryDirectory, "rules.pdf");
    await page.pdf({
      path: temporaryPDF,
      format: "Letter",
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
      tagged: true,
      outline: true,
    });
    const pdf = await readFile(temporaryPDF);
    if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-")) || pdf.length < 1024) {
      throw new Error("Chromium did not produce a valid, nonempty PDF.");
    }
    await rename(temporaryPDF, outputPath);
    console.log(`Generated ${relative(root, outputPath)} (${pdf.length} bytes).`);
  } finally {
    try {
      if (temporaryDirectory) {
        await rm(join(temporaryDirectory, "rules.pdf"), { force: true });
        await rmdir(temporaryDirectory);
      }
    } finally {
      await browser.close();
    }
  }
}

generate().catch(error => {
  console.error("Failed to generate the rally rules PDF:", error);
  process.exitCode = 1;
});
