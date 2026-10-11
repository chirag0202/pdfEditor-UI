# Paperplane PDF workspace

Standalone browser UI for the PDF editor backend. No frontend dependencies or build step are required.

## Run locally

1. Start the backend from `pdfEditor-v1` with `.\mvnw.cmd spring-boot:run`.
2. In this folder, run `python -m http.server 5173`.
3. Open `http://localhost:5173` in your browser. The backend allows this default local CORS origin.

The API URL can be changed in the top-right corner and is remembered in browser storage.

## Available tools

- Inspect PDFs, view page information and metadata, and preview/navigate rendered pages.
- Merge two PDFs, split pages into a ZIP, extract selected pages, and rotate a page.
- Convert office documents and images to PDF (LibreOffice must be installed on the backend).
- Export selectable PDF text to DOCX or TXT.

Uploads are sent to the backend only when needed. File operations are subject to the backend's 50 MB per-file and 500-page limits. PDF-to-DOCX export extracts text and does not preserve page layout, images, or original formatting.
