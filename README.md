# Paperplane PDF workspace

Standalone browser UI for the PDF editor backend. No frontend dependencies or build step are required.

## Run locally

1. Start the backend from `pdfEditor-v1` with `.\mvnw.cmd spring-boot:run` (API port `7000`).
2. In this folder, run `python -m http.server 6999`.
3. Open `http://localhost:6999` in your browser. The backend allows this default local CORS origin.

The API URL can be changed in the top-right corner and is remembered in browser storage. For a deployed HTTPS workspace, the UI automatically uses the same HTTPS origin for API calls and refuses insecure HTTP API URLs.
Every tool includes a result filename field; the appropriate `.pdf`, `.zip`, `.docx`, or `.txt` extension is added automatically. Inspecting a PDF also offers a download of the original file using the chosen name. The password protection tool supports PDF, DOCX, XLSX, and PPTX files; password inputs are sent to the backend only for processing and are not saved in browser storage.

For a one-script public Linux deployment with automatic HTTPS, see the [backend Linux deployment instructions](../pdfEditor-v1/README.md#linux-production-deployment).

For local workstation build and launch scripts, use the tools in the sibling `paperplane-deploy/scripts` folder. The [backend README](../pdfEditor-v1/README.md#local-workstation-launch) has command examples.

## Available tools

- Inspect PDFs, view page information and metadata, and preview/navigate rendered pages.
- Merge any number of PDFs (at least two; 50 MB per file and 100 MB total request limit), split pages into a ZIP, extract selected pages, and rotate a page.
- Convert office documents and images to PDF (LibreOffice must be installed on the backend).
- Export selectable PDF text to DOCX or TXT.
- Add passwords to PDFs and modern Word, Excel, and PowerPoint files, or remove a file-open password by supplying the current password. A separate action removes Word editing and Excel sheet/workbook restrictions without changing file-open encryption. Password recovery and legacy Office formats are not supported.

Uploads are sent to the backend only when needed. File operations are subject to the backend's 50 MB per-file and 500-page limits. PDF-to-DOCX export extracts text and does not preserve page layout, images, or original formatting.
