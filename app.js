const tools = {
	view: {
		title: "View & inspect",
		icon: "▤",
		description: "Take a closer look at your PDF. Check its pages and preview them right here.",
		button: "Inspect PDF",
		tip: "Your document is processed by your local backend. No uploads are saved by this interface.",
		fields: [{ key: "file", label: "Choose a PDF", accept: ".pdf,application/pdf", help: "PDF · up to 50 MB" }]
	},
	merge: {
		title: "Merge PDFs",
		icon: "⇶",
		description: "Bring your documents together into one tidy PDF. Files are merged in the order you choose.",
		button: "Merge PDFs",
		tip: "Add at least two PDFs. Arrange them in the order you want before merging.",
		fields: [
			{ key: "first", label: "First PDF", accept: ".pdf,application/pdf", help: "PDF · up to 50 MB" },
			{ key: "second", label: "Second PDF", accept: ".pdf,application/pdf", help: "Add another PDF" }
		]
	},
	split: {
		title: "Split PDF",
		icon: "⫶",
		description: "Separate a document into individual pages, packaged together in a convenient ZIP.",
		button: "Split into pages",
		tip: "Each page becomes its own PDF inside a ZIP file. PDFs up to 500 pages are supported.",
		fields: [{ key: "file", label: "Choose a PDF to split", accept: ".pdf,application/pdf", help: "PDF · up to 50 MB" }]
	},
	extract: {
		title: "Extract pages",
		icon: "▣",
		description: "Pick the pages you need and create a separate PDF in exactly the order you specify.",
		button: "Extract pages",
		tip: "Use commas and ranges, like 1,3-5. Your selection order is preserved.",
		fields: [{ key: "file", label: "Choose a PDF", accept: ".pdf,application/pdf", help: "PDF · up to 50 MB" }],
		options: [{ name: "pages", label: "Pages to extract", value: "1", placeholder: "e.g. 1, 3-5" }]
	},
	rotate: {
		title: "Rotate page",
		icon: "↻",
		description: "Correct a page’s orientation without changing the rest of your document.",
		button: "Rotate page",
		tip: "Rotation applies to just one page. Choose 90°, 180°, or 270° clockwise.",
		fields: [{ key: "file", label: "Choose a PDF", accept: ".pdf,application/pdf", help: "PDF · up to 50 MB" }],
		options: [
			{ name: "page", label: "Page number", value: "1", type: "number", min: "1" },
			{ name: "degrees", label: "Turn by", type: "select", options: [["90", "90° clockwise"], ["180", "180°"], ["270", "270° clockwise"]], value: "90" }
		]
	},
	toPdf: {
		title: "Documents to PDF",
		icon: "↗",
		description: "Turn Office documents, spreadsheets, presentations, and images into PDFs.",
		button: "Convert to PDF",
		tip: "Document conversion uses LibreOffice on your backend. Install LibreOffice to enable this tool.",
		fields: [{ key: "file", label: "Choose a document", accept: ".doc,.docx,.odt,.rtf,.txt,.ppt,.pptx,.odp,.xls,.xlsx,.ods,.csv,.html,.htm,.jpg,.jpeg,.png,.bmp,.gif", help: "DOCX, XLSX, PPTX, ODT, images & more" }]
	},
	fromPdf: {
		title: "PDF to Word / text",
		icon: "↙",
		description: "Export the selectable text from a PDF into an editable Word or plain-text file.",
		button: "Export document",
		tip: "This extracts selectable text. Original page layouts, images, and formatting are not preserved.",
		fields: [{ key: "file", label: "Choose a PDF", accept: ".pdf,application/pdf", help: "PDF · up to 50 MB" }],
		options: [{ name: "format", label: "Export as", type: "select", value: "docx", options: [["docx", "Word document (.docx)"], ["txt", "Plain text (.txt)"]] }]
	}
};

const state = {
	tool: "view",
	files: new Map(),
	pageCount: 0,
	currentPage: 1,
	previewFile: null,
	previewUrl: null,
	downloadUrl: null,
	toastTimer: null
};

const elements = {
	nav: document.querySelector(".tool-nav"),
	apiUrl: document.querySelector("#apiUrl"),
	apiIndicator: document.querySelector("#apiIndicator"),
	breadcrumb: document.querySelector("#breadcrumbTool"),
	pageTitle: document.querySelector("#pageTitle"),
	pageDescription: document.querySelector("#pageDescription"),
	toolIcon: document.querySelector("#toolIcon"),
	toolTitle: document.querySelector("#activeToolTitle"),
	toolDescription: document.querySelector("#toolDescription"),
	tips: document.querySelector("#tipsCopy"),
	fields: document.querySelector("#fileFields"),
	options: document.querySelector("#optionFields"),
	form: document.querySelector("#toolForm"),
	error: document.querySelector("#formError"),
	submit: document.querySelector("#submitButton"),
	submitLabel: document.querySelector("#submitLabel"),
	result: document.querySelector("#resultPanel"),
	resultTitle: document.querySelector("#resultTitle"),
	resultContent: document.querySelector("#resultContent"),
	clearResult: document.querySelector("#clearResult"),
	preview: document.querySelector("#previewCanvas"),
	previewControls: document.querySelector("#previewControls"),
	previewPage: document.querySelector("#previewPageNumber"),
	previewCount: document.querySelector("#previewPageCount"),
	prevPage: document.querySelector("#prevPage"),
	nextPage: document.querySelector("#nextPage"),
	toast: document.querySelector("#toast")
};

function apiBase() {
	return elements.apiUrl.value.trim().replace(/\/+$/, "");
}

function switchTool(name) {
	const tool = tools[name];
	if (!tool) return;
	state.tool = name;
	state.files.clear();
	clearResult();
	elements.error.hidden = true;
	document.querySelectorAll(".nav-item").forEach(button => {
		const active = button.dataset.tool === name;
		button.classList.toggle("active", active);
		if (active) button.setAttribute("aria-current", "page");
		else button.removeAttribute("aria-current");
	});
	elements.breadcrumb.textContent = tool.title;
	elements.pageTitle.innerHTML = `${tool.title === "View & inspect" ? "Make room for <span>good work.</span>" : `${escapeHtml(tool.title)} <span>made simple.</span>`}`;
	elements.pageDescription.textContent = tool.title === "View & inspect"
		? "Everything you need to view, organize, and fine-tune your PDFs."
		: "A thoughtful little workspace for all your document tasks.";
	elements.toolIcon.textContent = tool.icon;
	elements.toolTitle.textContent = tool.title;
	elements.toolDescription.textContent = tool.description;
	elements.tips.textContent = tool.tip;
	elements.submitLabel.textContent = tool.button;
	renderFields(tool);
	showEmptyPreview();
}

function renderFields(tool) {
	elements.fields.replaceChildren();
	for (const field of tool.fields) {
		const wrapper = document.createElement("div");
		wrapper.className = "upload-field";
		const label = document.createElement("span");
		label.className = "upload-label";
		label.textContent = field.label;
		const drop = document.createElement("label");
		drop.className = "dropzone";
		drop.dataset.field = field.key;
		const input = document.createElement("input");
		input.type = "file";
		input.accept = field.accept;
		input.setAttribute("aria-label", field.label);
		input.dataset.field = field.key;
		const icon = document.createElement("span");
		icon.className = "upload-icon";
		icon.setAttribute("aria-hidden", "true");
		icon.textContent = "↑";
		const copy = document.createElement("span");
		copy.className = "drop-copy";
		const filename = document.createElement("strong");
		filename.textContent = "Drop your file here";
		const helper = document.createElement("span");
		helper.textContent = field.help;
		copy.append(filename, helper);
		const browse = document.createElement("span");
		browse.className = "browse-link";
		browse.textContent = "Browse files";
		drop.append(input, icon, copy, browse);
		wrapper.append(label, drop);
		elements.fields.append(wrapper);
		input.addEventListener("change", () => {
			const file = input.files?.[0];
			if (file) setFile(field.key, file, input, drop, filename, helper);
		});
		drop.addEventListener("dragover", event => {
			event.preventDefault();
			drop.classList.add("dragging");
		});
		drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
		drop.addEventListener("drop", event => {
			event.preventDefault();
			drop.classList.remove("dragging");
			const file = event.dataTransfer?.files?.[0];
			if (file) setFile(field.key, file, input, drop, filename, helper);
		});
	}

	elements.options.replaceChildren();
	for (const field of tool.options ?? []) {
		const wrapper = document.createElement("div");
		wrapper.className = "field-group";
		const label = document.createElement("label");
		label.htmlFor = `option-${field.name}`;
		label.textContent = field.label;
		let input;
		if (field.type === "select") {
			input = document.createElement("select");
			for (const [value, text] of field.options) {
				const option = document.createElement("option");
				option.value = value;
				option.textContent = text;
				input.append(option);
			}
		} else {
			input = document.createElement("input");
			input.type = field.type ?? "text";
			if (field.min) input.min = field.min;
			input.placeholder = field.placeholder ?? "";
		}
		input.id = `option-${field.name}`;
		input.name = field.name;
		input.value = field.value;
		input.required = true;
		wrapper.append(label, input);
		elements.options.append(wrapper);
	}
	if (tool.options?.some(field => field.name === "pages")) {
		const note = document.createElement("div");
		note.className = "field-note";
		note.textContent = "Separate pages with commas; use a hyphen for a range.";
		elements.options.append(note);
	}
}

function setFile(key, file, input, drop, filename, helper) {
	if (file.size > 50 * 1024 * 1024) {
		showError(`${file.name} is over the 50 MB file limit.`);
		input.value = "";
		state.files.delete(key);
		return;
	}
	state.files.set(key, file);
	filename.textContent = file.name;
	helper.textContent = `${formatSize(file.size)} · Ready to process`;
	drop.classList.add("has-file");
	elements.error.hidden = true;
	if (state.tool === "view" && isPdf(file)) inspectAndPreview(file);
}

function isPdf(file) {
	return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
}

function formatSize(bytes) {
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
	return value.replace(/[&<>"']/g, character => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
	})[character]);
}

function readOptions() {
	return Object.fromEntries([...elements.options.querySelectorAll("input, select")].map(input => [input.name, input.value.trim()]));
}

function validateForm() {
	const config = tools[state.tool];
	const needed = config.fields.map(field => [field, state.files.get(field.key)]);
	const missing = needed.find(([, file]) => !file);
	if (missing) return `Choose a file for “${missing[0].label}” first.`;
	for (const [field, file] of needed) {
		if ((field.accept.includes("application/pdf") || field.accept.includes(".pdf")) && !isPdf(file)) {
			return `${field.label} must be a PDF file.`;
		}
	}
	const options = readOptions();
	if (options.page && (!Number.isInteger(Number(options.page)) || Number(options.page) < 1)) return "Enter a page number greater than zero.";
	if (options.pages && !/^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/.test(options.pages)) return "Enter pages as numbers or ranges, for example 1,3-5.";
	return "";
}

function buildRequest() {
	const file = state.files.get("file");
	const options = readOptions();
	const form = new FormData();
	let url;
	let outputName;
	let outputType;
	switch (state.tool) {
		case "view":
			form.append("file", file);
			url = "/api/pdf/info";
			break;
		case "merge":
			form.append("files", state.files.get("first"));
			form.append("files", state.files.get("second"));
			url = "/api/pdf/merge";
			outputName = "merged.pdf";
			outputType = "application/pdf";
			break;
		case "split":
			form.append("file", file);
			url = "/api/pdf/split";
			outputName = "split-pages.zip";
			outputType = "application/zip";
			break;
		case "extract":
			form.append("file", file);
			form.append("pages", options.pages);
			url = "/api/pdf/extract";
			outputName = "extracted-pages.pdf";
			outputType = "application/pdf";
			break;
		case "rotate":
			form.append("file", file);
			form.append("page", options.page);
			form.append("degrees", options.degrees);
			url = "/api/pdf/rotate";
			outputName = "rotated.pdf";
			outputType = "application/pdf";
			break;
		case "toPdf":
			form.append("file", file);
			url = "/api/convert/to-pdf";
			outputName = `${file.name.replace(/\.[^.]+$/, "")}.pdf`;
			outputType = "application/pdf";
			break;
		case "fromPdf":
			form.append("file", file);
			form.append("format", options.format);
			url = "/api/convert/from-pdf";
			outputName = `${file.name.replace(/\.[^.]+$/, "")}.${options.format}`;
			outputType = options.format === "txt" ? "text/plain" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
			break;
	}
	return { form, url, outputName, outputType };
}

async function handleSubmit(event) {
	event.preventDefault();
	clearResult();
	const error = validateForm();
	if (error) {
		showError(error);
		return;
	}
	elements.error.hidden = true;
	const request = buildRequest();
	setLoading(true);
	try {
		const response = await fetch(`${apiBase()}${request.url}`, { method: "POST", body: request.form });
		elements.apiIndicator.style.background = response.ok ? "#55b27c" : "#d79453";
		if (!response.ok) {
			const message = await readError(response);
			throw new Error(message);
		}
		if (state.tool === "view") {
			const info = await response.json();
			state.pageCount = info.pageCount;
			state.currentPage = 1;
			showMetadata(info);
			await renderPage(state.files.get("file"), 1, info.pageCount);
		} else {
			const blob = await response.blob();
			const filename = filenameFromHeader(response.headers.get("Content-Disposition")) || request.outputName;
			showDownload(blob, filename, request.outputType, state.tool === "fromPdf" && request.outputType === "text/plain");
			if (request.outputType === "application/pdf") {
				const file = new File([blob], filename, { type: "application/pdf" });
				await inspectResultPdf(file);
			} else if (request.outputType === "application/zip") {
				showPreviewPlaceholder("Your split files are ready", "Download the ZIP to access each page as a separate PDF.");
			}
		}
	} catch (error) {
		const message = error instanceof TypeError
			? `Could not connect to ${apiBase()}. Make sure the backend is running and the API URL is correct.`
			: error.message;
		showError(message);
		elements.apiIndicator.style.background = error instanceof TypeError ? "#d46b5e" : "#d79453";
	} finally {
		setLoading(false);
	}
}

async function readError(response) {
	try {
		const body = await response.json();
		return body.error || `Request failed (${response.status}).`;
	} catch {
		return `Request failed (${response.status}). Check that the backend is running and the request is valid.`;
	}
}

function filenameFromHeader(header) {
	if (!header) return "";
	const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
	if (encoded) {
		try { return decodeURIComponent(encoded[1].replace(/^"|"$/g, "")); } catch { return encoded[1]; }
	}
	return header.match(/filename="?([^";]+)"?/i)?.[1] ?? "";
}

function setLoading(loading) {
	elements.submit.disabled = loading;
	elements.submitLabel.textContent = loading ? "Working on your document…" : tools[state.tool].button;
	if (loading) elements.apiIndicator.style.background = "#d9aa54";
}

function showError(message) {
	elements.error.textContent = message;
	elements.error.hidden = false;
	showToast(message, true);
}

function showToast(message, isError = false) {
	clearTimeout(state.toastTimer);
	elements.toast.textContent = message;
	elements.toast.classList.toggle("error", isError);
	elements.toast.classList.add("show");
	state.toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 4000);
}

function clearResult() {
	if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
	if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
	state.previewUrl = null;
	state.downloadUrl = null;
	state.pageCount = 0;
	state.currentPage = 1;
	state.previewFile = null;
	elements.result.hidden = true;
	elements.resultContent.replaceChildren();
	showEmptyPreview();
}

function showEmptyPreview() {
	elements.previewControls.hidden = true;
	elements.preview.replaceChildren();
	const empty = document.createElement("div");
	empty.className = "preview-empty";
	const file = document.createElement("div");
	file.className = "empty-file";
	const badge = document.createElement("span");
	badge.textContent = "PDF";
	file.append(badge);
	for (let i = 0; i < 4; i++) {
		const line = document.createElement("i");
		file.append(line);
	}
	const title = document.createElement("strong");
	title.textContent = "Your document will appear here";
	const hint = document.createElement("span");
	hint.textContent = "Choose a PDF to see it in action";
	empty.append(file, title, hint);
	elements.preview.append(empty);
}

function showPreviewPlaceholder(title, hint) {
	elements.previewControls.hidden = true;
	elements.preview.replaceChildren();
	const placeholder = document.createElement("div");
	placeholder.className = "preview-placeholder-result";
	const icon = document.createElement("div");
	icon.className = "empty-file";
	const badge = document.createElement("span");
	badge.textContent = "PDF";
	icon.append(badge);
	for (let i = 0; i < 3; i++) icon.append(document.createElement("i"));
	const strong = document.createElement("strong");
	strong.textContent = title;
	const detail = document.createElement("span");
	detail.textContent = hint;
	placeholder.append(icon, strong, detail);
	elements.preview.append(placeholder);
}

function showMetadata(info) {
	elements.result.hidden = false;
	elements.resultTitle.textContent = "PDF details";
	elements.resultContent.replaceChildren();
	const grid = document.createElement("div");
	grid.className = "metadata-grid";
	const values = [
		["Pages", info.pageCount],
		["Page size", info.pages?.[0] ? `${Math.round(info.pages[0].widthPoints)} × ${Math.round(info.pages[0].heightPoints)} pt` : "—"],
		["Rotation", info.pages?.[0] ? `${info.pages[0].rotation}°` : "—"]
	];
	for (const [label, value] of values) {
		const item = document.createElement("div");
		item.className = "metadata-item";
		const name = document.createElement("span");
		name.textContent = label;
		const detail = document.createElement("strong");
		detail.textContent = value;
		item.append(name, detail);
		grid.append(item);
	}
	for (const [key, value] of Object.entries(info.metadata ?? {})) {
		const item = document.createElement("div");
		item.className = "metadata-item metadata-title";
		const name = document.createElement("span");
		name.textContent = key.charAt(0).toUpperCase() + key.slice(1);
		const detail = document.createElement("strong");
		detail.textContent = value;
		item.append(name, detail);
		grid.append(item);
	}
	elements.resultContent.append(grid);
}

function showDownload(blob, filename, type, showText) {
	if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
	state.downloadUrl = URL.createObjectURL(new Blob([blob], { type }));
	elements.result.hidden = false;
	elements.resultTitle.textContent = "Your file is ready";
	elements.resultContent.replaceChildren();
	if (showText) {
		const preview = document.createElement("pre");
		preview.className = "plain-output";
		blob.text().then(text => { preview.textContent = text || "No selectable text was found in this PDF."; });
		elements.resultContent.append(preview);
	}
	const row = document.createElement("div");
	row.className = "download-row";
	const icon = document.createElement("span");
	icon.className = "download-icon";
	icon.textContent = extensionLabel(filename);
	const details = document.createElement("div");
	details.className = "download-info";
	const name = document.createElement("strong");
	name.textContent = filename;
	const size = document.createElement("span");
	size.textContent = `${formatSize(blob.size)} · Ready to download`;
	details.append(name, size);
	const download = document.createElement("a");
	download.className = "download-link";
	download.href = state.downloadUrl;
	download.download = filename;
	download.textContent = "Download ↓";
	row.append(icon, details, download);
	elements.resultContent.append(row);
}

function extensionLabel(filename) {
	const extension = filename.split(".").pop()?.toUpperCase() ?? "FILE";
	return extension.length > 4 ? "FILE" : extension;
}

async function inspectAndPreview(file) {
	try {
		state.previewFile = file;
		const form = new FormData();
		form.append("file", file);
		const response = await fetch(`${apiBase()}/api/pdf/info`, { method: "POST", body: form });
		if (!response.ok) throw new Error(await readError(response));
		const info = await response.json();
		state.pageCount = info.pageCount;
		state.currentPage = 1;
		showMetadata(info);
		await renderPage(file, 1, info.pageCount);
		elements.apiIndicator.style.background = "#55b27c";
	} catch (error) {
		elements.apiIndicator.style.background = error instanceof TypeError ? "#d46b5e" : "#d79453";
		showPreviewPlaceholder("PDF selected", error instanceof TypeError
			? "Start the backend to preview this document."
			: error.message);
	}
}

async function inspectResultPdf(file) {
	state.previewFile = file;
	const form = new FormData();
	form.append("file", file);
	const response = await fetch(`${apiBase()}/api/pdf/info`, { method: "POST", body: form });
	if (!response.ok) throw new Error(`The PDF was created, but its preview failed: ${await readError(response)}`);
	const info = await response.json();
	state.pageCount = info.pageCount;
	state.currentPage = 1;
	await renderPage(file, 1, info.pageCount);
}

async function renderPage(file, page, count) {
	const form = new FormData();
	form.append("file", file);
	form.append("page", String(page));
	form.append("dpi", "96");
	const response = await fetch(`${apiBase()}/api/pdf/render`, { method: "POST", body: form });
	if (!response.ok) throw new Error(await readError(response));
	const blob = await response.blob();
	if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
	state.previewUrl = URL.createObjectURL(blob);
	const image = document.createElement("img");
	image.className = "preview-image";
	image.alt = `Page ${page} of ${count}`;
	image.src = state.previewUrl;
	elements.preview.replaceChildren(image);
	elements.previewControls.hidden = false;
	elements.previewPage.textContent = String(page);
	elements.previewCount.textContent = String(count);
	elements.prevPage.disabled = page <= 1;
	elements.nextPage.disabled = page >= count;
}

document.querySelectorAll(".tool-nav").forEach(nav => {
	nav.addEventListener("click", event => {
		const button = event.target.closest("[data-tool]");
		if (button) switchTool(button.dataset.tool);
	});
});
elements.form.addEventListener("submit", handleSubmit);
elements.clearResult.addEventListener("click", clearResult);
elements.prevPage.addEventListener("click", async () => {
	const file = state.previewFile;
	if (!file || state.currentPage <= 1) return;
	try {
		state.currentPage--;
		await renderPage(file, state.currentPage, state.pageCount);
	} catch (error) {
		state.currentPage++;
		showToast(error.message, true);
	}
});
elements.nextPage.addEventListener("click", async () => {
	const file = state.previewFile;
	if (!file || state.currentPage >= state.pageCount) return;
	try {
		state.currentPage++;
		await renderPage(file, state.currentPage, state.pageCount);
	} catch (error) {
		state.currentPage--;
		showToast(error.message, true);
	}
});
elements.apiUrl.value = localStorage.getItem("paperplane-api-url") || elements.apiUrl.value;
elements.apiUrl.addEventListener("change", () => {
	localStorage.setItem("paperplane-api-url", apiBase());
	elements.apiIndicator.style.background = "#55b27c";
});
switchTool("view");
