import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { createRequire } from "module";
import { tmpdir } from "os";
import { join } from "path";
import { PassThrough } from "stream";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ExportFormat = "epub" | "docx";
type ChapterInput = {
  id?: string;
  title?: string;
  subtitle?: string;
  content?: string;
};

type ExportPayload = {
  format?: ExportFormat;
  novelTitle?: string;
  authorName?: string;
  novelSynopsis?: string;
  coverImage?: string | null;
  chapters?: ChapterInput[];
};

type NormalizedChapter = {
  id: string;
  title: string;
  subtitle: string;
  content: string;
};

type ArchiverLike = {
  append(source: string | Buffer, data: { name: string; store?: boolean }): void;
  pipe(stream: PassThrough): void;
  finalize(): void;
  on(event: "error", listener: (error: unknown) => void): void;
};

type ArchiverFactory = (
  format: "zip",
  options?: {
    zlib?: {
      level?: number;
    };
  },
) => ArchiverLike;

const EPUB_STYLE_CSS = `
body {
  font-family: Georgia, "Times New Roman", serif;
  color: #111827;
  line-height: 1.65;
}
h1 {
  margin: 0 0 0.8em;
}
p {
  margin: 0 0 0.9em;
}
.epub-author,
.epub-link {
  color: #475569;
  margin-top: 0;
}
`;
const EPUB_OPF_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
         version="3.0"
         unique-identifier="BookId"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         xmlns:dcterms="http://purl.org/dc/terms/"
         xml:lang="en"
         xmlns:media="http://www.idpf.org/epub/vocab/overlays/#"
         prefix="ibooks: http://vocabulary.itunes.apple.com/rdf/ibooks/vocabulary-extensions-1.0/">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:identifier id="BookId"><%= id %></dc:identifier>
        <dc:title><%= title %></dc:title>
        <dc:language><%= lang || "en" %></dc:language>
        <meta property="dcterms:modified"><%= (new Date()).toISOString().split(".")[0]+ "Z" %></meta>
        <dc:creator id="creator"><%= author.length ? author.join(",") : author %></dc:creator>
        <meta property="dcterms:publisher"><%= publisher || "anonymous" %></meta>
        <dc:publisher><%= publisher || "anonymous" %></dc:publisher>
        <meta name="generator" content="epub-gen" />
        <% if(locals.cover) { %>
        <meta name="cover" content="image_cover"/>
        <% } %>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
        <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        <item id="css" href="style.css" media-type="text/css" />
        <% if(locals.cover) { %>
        <item id="image_cover" href="cover.<%= _coverExtension %>" media-type="<%= _coverMediaType %>" />
        <% } %>
        <% images.forEach(function(image, index){ %>
        <item id="image_<%= index %>" href="images/<%= image.id %>.<%= image.extension %>" media-type="<%= image.mediaType %>" />
        <% }) %>
        <% content.forEach(function(content, index){ %>
        <item id="content_<%= index %>_<%= content.id %>" href="<%= content.href %>" media-type="application/xhtml+xml" />
        <% }) %>
    </manifest>
    <spine toc="ncx">
        <itemref idref="toc" />
        <% content.forEach(function(content, index){ %>
            <% if(!content.excludeFromToc){ %>
                <itemref idref="content_<%= index %>_<%= content.id %>"/>
            <% } %>
        <% }) %>
    </spine>
    <guide>
        <reference type="text" title="Table of Content" href="toc.xhtml"/>
    </guide>
</package>`;
const EPUB_NCX_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="<%= id %>" />
        <meta name="dtb:generator" content="epub-gen"/>
        <meta name="dtb:depth" content="1"/>
        <meta name="dtb:totalPageCount" content="0"/>
        <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle>
        <text><%= title %></text>
    </docTitle>
    <docAuthor>
        <text><%= author %></text>
    </docAuthor>
    <navMap>
        <navPoint id="toc" playOrder="0" class="chapter">
            <navLabel>
                <text><%= tocTitle %></text>
            </navLabel>
            <content src="toc.xhtml"/>
        </navPoint>
        <% content.forEach(function(content, index){ %>
            <% if(!content.excludeFromToc){ %>
                <navPoint id="content_<%= index %>_<%= content.id %>" playOrder="<%= index + 1 %>" class="chapter">
                    <navLabel>
                        <text><%= (1+index) + ". " + (content.title || "Chapter " + (1+index))%></text>
                    </navLabel>
                    <content src="<%= content.href %>"/>
                </navPoint>
            <% } %>
        <% }) %>
    </navMap>
</ncx>`;
const EPUB_HTML_TOC_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="<%- lang %>" lang="<%- lang %>">
<head>
    <title><%= title %></title>
    <meta charset="UTF-8" />
    <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
<h1 class="h1"><%= tocTitle %></h1>
<nav id="toc" epub:type="toc">
    <ol>
        <% content.forEach(function(content, index){ %>
            <% if(!content.excludeFromToc){ %>
                <li class="table-of-content">
                    <a href="<%= content.href %>"><%= (content.title || "Chapter "+ (1+index)) %></a>
                </li>
            <% } %>
        <% }) %>
    </ol>
</nav>
</body>
</html>`;

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") || "pilotwriter"
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textToHtml(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "<p></p>";
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

/** Extract only prose from bloc-delimited content. Strips all bloc metadata/synopses. */
function extractProseOnly(raw: string): string {
  if (!raw.includes("<<<BLOCK>>>")) return raw;
  const parts = raw.split("<<<BLOCK>>>").filter(Boolean);
  const proseChunks: string[] = [];
  for (const part of parts) {
    const proseIdx = part.indexOf("<<<PROSE>>>");
    const endIdx = part.indexOf("<<<ENDBLOCK>>>");
    if (proseIdx === -1 || endIdx === -1) continue;
    const prose = part.slice(proseIdx + "<<<PROSE>>>".length, endIdx).trim();
    if (prose) proseChunks.push(prose);
  }
  if (proseChunks.length > 0) return proseChunks.join("\n\n\n");
  // Fallback: strip all delimiters even if parsing fails
  return raw
    .replace(/<<<BLOCK>>>/g, "")
    .replace(/<<<PROSE>>>/g, "")
    .replace(/<<<ENDBLOCK>>>/g, "")
    .replace(/<<<META>>>/g, "")
    .replace(/<<<SYNOPSIS>>>/g, "")
    .trim();
}

function normalizePayloadChapters(chapters: ChapterInput[]) {
  return chapters.map((chapter, index): NormalizedChapter => {
    const title = typeof chapter.title === "string" && chapter.title.trim() ? chapter.title.trim() : `Chapter ${index + 1}`;
    const subtitle = typeof chapter.subtitle === "string" ? chapter.subtitle : "";
    const rawContent = typeof chapter.content === "string" ? chapter.content : "";
    const content = extractProseOnly(rawContent);
    return {
      id: typeof chapter.id === "string" && chapter.id ? chapter.id : `${index + 1}`,
      title,
      subtitle,
      content,
    };
  });
}

async function getArchiverFactory() {
  const archiverModule = (await import("archiver")) as unknown as {
    default?: ArchiverFactory;
  } & {
    [key: string]: unknown;
  };
  const createArchiver = (archiverModule.default ??
    (archiverModule as unknown as ArchiverFactory)) as ArchiverFactory | undefined;
  if (!createArchiver) {
    throw new Error("Archive tool is unavailable.");
  }
  return createArchiver;
}

async function createZipBuffer(
  files: Array<{
    name: string;
    content: string | Buffer;
    store?: boolean;
  }>,
) {
  const createArchiver = await getArchiverFactory();

  return await new Promise<Buffer>((resolve, reject) => {
    const archive = createArchiver("zip", { zlib: { level: 9 } });
    const output = new PassThrough();
    const chunks: Buffer[] = [];

    output.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    output.on("end", () => resolve(Buffer.concat(chunks)));
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);
    files.forEach((file) => {
      archive.append(file.content, { name: file.name, store: file.store });
    });
    archive.finalize();
  });
}

function paragraphXml(text: string, opts?: { bold?: boolean }) {
  if (!text) return "<w:p/>";
  const escaped = escapeXml(text);
  const bold = opts?.bold ? "<w:rPr><w:b/></w:rPr>" : "";
  return `<w:p><w:r>${bold}<w:t xml:space=\"preserve\">${escaped}</w:t></w:r></w:p>`;
}

function pageBreakXml() {
  return "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>";
}

function buildDocxDocumentXml(title: string, authorName: string, synopsis: string, chapters: NormalizedChapter[]) {
  const body: string[] = [];

  body.push(paragraphXml(title, { bold: true }));
  if (authorName) {
    body.push(paragraphXml(authorName));
  }
  if (synopsis.trim()) {
    body.push(paragraphXml(""));
    body.push(paragraphXml("Synopsis", { bold: true }));
    synopsis.replace(/\r\n/g, "\n").split("\n").forEach((line) => {
      body.push(paragraphXml(line));
    });
  }

  chapters.forEach((chapter, index) => {
    if (index > 0 || synopsis.trim()) {
      body.push(pageBreakXml());
    }
    body.push(paragraphXml(chapter.title, { bold: true }));
    if (chapter.subtitle.trim()) {
      body.push(paragraphXml(chapter.subtitle));
    }
    chapter.content.replace(/\r\n/g, "\n").split("\n").forEach((line) => {
      body.push(paragraphXml(line));
    });
  });

  body.push(
    "<w:sectPr><w:pgSz w:w=\"12240\" w:h=\"15840\"/><w:pgMar w:top=\"1440\" w:right=\"1440\" w:bottom=\"1440\" w:left=\"1440\" w:header=\"708\" w:footer=\"708\" w:gutter=\"0\"/></w:sectPr>",
  );

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">",
    "<w:body>",
    body.join(""),
    "</w:body>",
    "</w:document>",
  ].join("");
}

async function buildDocxBuffer(title: string, authorName: string, synopsis: string, chapters: NormalizedChapter[]) {
  const createdAt = new Date().toISOString();
  const safeTitle = title || "Untitled Novel";
  const metaAuthor = authorName || "";
  const documentXml = buildDocxDocumentXml(safeTitle, authorName, synopsis, chapters);

  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>PilotWriter</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>1.0</AppVersion>
</Properties>`,
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(safeTitle)}</dc:title>
  <dc:creator>${metaAuthor ? escapeXml(metaAuthor) : ""}</dc:creator>
  <cp:lastModifiedBy>${metaAuthor ? escapeXml(metaAuthor) : ""}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
</cp:coreProperties>`,
    },
    {
      name: "word/document.xml",
      content: documentXml,
    },
    {
      name: "word/_rels/document.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
    },
  ];

  return createZipBuffer(files);
}

type EpubContentItem = {
  title: string;
  data: string;
};

type EpubGeneratorOptions = {
  title: string;
  author: string;
  tocTitle?: string;
  appendChapterTitles?: boolean;
  cover?: string;
  tempDir?: string;
  css?: string;
  lang?: string;
  version?: 2 | 3;
  customOpfTemplatePath?: string;
  customNcxTocTemplatePath?: string;
  customHtmlTocTemplatePath?: string;
  content: EpubContentItem[];
};

type EpubGeneratorConstructor = new (
  options: EpubGeneratorOptions,
  output: string,
) => {
  promise: Promise<void>;
};

function getEpubGenerator() {
  const require = createRequire(import.meta.url);
  const candidate = require("epub-gen") as unknown as {
    default?: EpubGeneratorConstructor;
  };
  const Epub = (candidate?.default ?? (candidate as unknown as EpubGeneratorConstructor)) as
    | EpubGeneratorConstructor
    | undefined;
  if (!Epub) {
    throw new Error("EPUB generator is unavailable.");
  }
  return Epub;
}

async function writeCoverTempFile(coverImage: string) {
  const match = coverImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const extensionMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const extension = extensionMap[mimeType];
  if (!extension) return null;

  const filePath = join(tmpdir(), `pilotwriter-cover-${randomUUID()}.${extension}`);
  try {
    await writeFile(filePath, Buffer.from(match[2], "base64"));
    return filePath;
  } catch {
    return null;
  }
}

async function ensureEpubTemplateFiles(epubTempDir: string) {
  const templateDir = join(epubTempDir, "templates");
  await mkdir(templateDir, { recursive: true });

  const opfPath = join(templateDir, "content.opf.ejs");
  const ncxPath = join(templateDir, "toc.ncx.ejs");
  const htmlTocPath = join(templateDir, "toc.xhtml.ejs");

  await Promise.all([
    writeFile(opfPath, EPUB_OPF_TEMPLATE, "utf8"),
    writeFile(ncxPath, EPUB_NCX_TEMPLATE, "utf8"),
    writeFile(htmlTocPath, EPUB_HTML_TOC_TEMPLATE, "utf8"),
  ]);

  return {
    opfPath,
    ncxPath,
    htmlTocPath,
  };
}

async function buildEpubBuffer(options: {
  title: string;
  authorName: string;
  synopsis: string;
  chapters: NormalizedChapter[];
  coverImage?: string | null;
}) {
  const Epub = getEpubGenerator();
  const safeTitle = options.title.trim() || "Untitled Novel";
  const epubTempDir = join(tmpdir(), "pilotwriter-epubgen-temp");
  await mkdir(epubTempDir, { recursive: true });
  const templateFiles = await ensureEpubTemplateFiles(epubTempDir);
  const outputPath = join(tmpdir(), `pilotwriter-${randomUUID()}.epub`);
  const tempPaths: string[] = [outputPath];
  let coverPath: string | undefined;

  if (options.coverImage) {
    const generatedCoverPath = await writeCoverTempFile(options.coverImage);
    if (generatedCoverPath) {
      coverPath = generatedCoverPath;
      tempPaths.push(generatedCoverPath);
    }
  }

  const content: EpubContentItem[] = [];

  if (options.synopsis.trim()) {
    content.push({
      title: "Synopsis",
      data: textToHtml(options.synopsis),
    });
  }

  options.chapters.forEach((chapter, index) => {
    const chapterTitle = chapter.title.trim() || `Chapter ${index + 1}`;
    const subtitle = chapter.subtitle.trim()
      ? `<p><em>${escapeHtml(chapter.subtitle.trim())}</em></p>`
      : "";
    content.push({
      title: chapterTitle,
      data: `${subtitle}${textToHtml(chapter.content)}`,
    });
  });

  try {
    const baseOptions: EpubGeneratorOptions = {
      title: safeTitle,
      author: options.authorName || "",
      tocTitle: "Contents",
      appendChapterTitles: false,
      tempDir: epubTempDir,
      css: EPUB_STYLE_CSS,
      lang: "en",
      version: 3,
      customOpfTemplatePath: templateFiles.opfPath,
      customNcxTocTemplatePath: templateFiles.ncxPath,
      customHtmlTocTemplatePath: templateFiles.htmlTocPath,
      content,
    };

    try {
      await new Epub(
        {
          ...baseOptions,
          ...(coverPath ? { cover: coverPath } : {}),
        },
        outputPath,
      ).promise;
    } catch (errorWithCover) {
      if (!coverPath) throw errorWithCover;
      // Retry once without cover if the image format/metadata causes EPUB creation to fail.
      await new Epub(baseOptions, outputPath).promise;
    }

    return await readFile(outputPath);
  } finally {
    await Promise.all(
      tempPaths.map((path) =>
        unlink(path).catch(() => {
          return undefined;
        }),
      ),
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ExportPayload;
    const format = payload.format;
    if (format !== "epub" && format !== "docx") {
      return NextResponse.json({ error: "format must be 'epub' or 'docx'." }, { status: 400 });
    }

    const chapters = Array.isArray(payload.chapters) ? normalizePayloadChapters(payload.chapters) : [];
    if (chapters.length === 0) {
      return NextResponse.json({ error: "Select at least one chapter to export." }, { status: 400 });
    }

    const title = typeof payload.novelTitle === "string" && payload.novelTitle.trim() ? payload.novelTitle.trim() : "Untitled Novel";
    const authorName = typeof payload.authorName === "string" ? payload.authorName.trim() : "";
    const synopsis = typeof payload.novelSynopsis === "string" ? payload.novelSynopsis : "";
    const slug = slugify(title);

    if (format === "epub") {
      const buffer = await buildEpubBuffer({
        title,
        authorName,
        synopsis,
        chapters,
        coverImage: payload.coverImage ?? null,
      });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `attachment; filename=\"${slug}.epub\"`,
        },
      });
    }

    const buffer = await buildDocxBuffer(title, authorName, synopsis, chapters);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename=\"${slug}.docx\"`,
      },
    });
  } catch (error) {
    console.error("Studio export failed", error);
    const message = error instanceof Error && error.message ? error.message : "Export failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
