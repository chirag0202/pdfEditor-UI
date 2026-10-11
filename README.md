# Paperplane PDF workspace

Standalone browser UI for the PDF editor backend. No frontend dependencies or build step are required.

## Run locally

1. Start the backend from `pdfEditor-v1` with `.\mvnw.cmd spring-boot:run` (API port `7000`).
2. In this folder, run `python -m http.server 6999`.
3. Open `http://localhost:6999` in your browser. The backend allows this default local CORS origin.

The API URL can be changed in the top-right corner and is remembered in browser storage.

For a Fedora workstation deployment that builds the backend and launches both servers, see the [backend Fedora deployment instructions](../pdfEditor-v1/README.md#fedora-workstation-build-and-launch).

For Windows build, deployment, and launch scripts, see the [backend Windows instructions](../pdfEditor-v1/README.md#windows-build-and-launch).

## Available tools

- Inspect PDFs, view page information and metadata, and preview/navigate rendered pages.
- Merge two PDFs, split pages into a ZIP, extract selected pages, and rotate a page.
- Convert office documents and images to PDF (LibreOffice must be installed on the backend).
- Export selectable PDF text to DOCX or TXT.

Uploads are sent to the backend only when needed. File operations are subject to the backend's 50 MB per-file and 500-page limits. PDF-to-DOCX export extracts text and does not preserve page layout, images, or original formatting.
