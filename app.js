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
		tip: "Add two or more PDFs and arrange them in order. Each file can be up to 50 MB; total upload is limited to 100 MB.",
		fields: [{ key: "files", label: "Choose PDFs to merge", accept: ".pdf,application/pdf", help: "Select multiple PDFs · up to 50 MB each", multiple: true }]
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
	},
	protection: {
		title: "Password protection",
		icon: "⌑",
		description: "Add or remove file-open passwords, or remove editing restrictions from Word and Excel files.",
		button: "Protect document",
		tip: "Removing a file-open password requires the current password. Word editing and Excel sheet/workbook locks can be removed separately without changing file-open encryption. Passwords are not saved by this interface.",
		fields: [{
			key: "file",
			label: "Choose a document",
			accept: ".pdf,.docx,.xlsx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument",
			extensions: [".pdf", ".docx", ".xlsx", ".pptx"],
			help: "PDF, DOCX, XLSX, or PPTX · up to 50 MB"
		}],
		options: [
			{ name: "action", label: "Action", type: "select", value: "add", options: [
				["add", "Add file-open password"],
				["remove-password", "Remove file-open password (current password required)"],
				["remove-restrictions", "Remove Word / Excel editing restrictions"]
			] },
			{ name: "password", label: "New password", type: "password", value: "", showWhen: "add" },
			{ name: "confirmPassword", label: "Confirm new password", type: "password", value: "", showWhen: "add" },
			{ name: "currentPassword", label: "Current file-open password", type: "password", value: "", showWhen: "remove-password" }
		]
	}
};

const state = {
	tool: "view",
	files: new Map(),
	mergeFiles: [],
	filenameTouched: false,
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
	const base = elements.apiUrl.value.trim().replace(/\/+$/, "");
	if (window.location.protocol === "https:" && new URL(base).protocol !== "https:") {
		throw new Error("Use an HTTPS API URL when the workspace is loaded over HTTPS.");
	}
	return base;
}

function switchTool(name) {
	const tool = tools[name];
	if (!tool) return;
	state.tool = name;
	state.files.clear();
	state.mergeFiles = [];
	state.filenameTouched = false;
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
	if (state.tool === "merge") {
		renderMergeField(tool.fields[0]);
	} else {
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
			if (field.type === "password") {
				input.autocomplete = "off";
				input.autocapitalize = "off";
				input.maxLength = 255;
			}
		}
		input.id = `option-${field.name}`;
		input.name = field.name;
		input.value = field.value;
		input.required = !field.showWhen;
		if (field.showWhen) wrapper.dataset.showWhen = field.showWhen;
		if (field.name === "format") {
			input.addEventListener("change", updateFilenameHint);
		}
		if (field.name === "action") {
			input.addEventListener("change", updateProtectionFields);
		}
		wrapper.append(label, input);
		elements.options.append(wrapper);
	}
	if (tool.options?.some(field => field.name === "pages")) {
		const note = document.createElement("div");
		note.className = "field-note";
		note.textContent = "Separate pages with commas; use a hyphen for a range.";
		elements.options.append(note);
	}
	const filenameGroup = document.createElement("div");
	filenameGroup.className = "field-group output-name-group";
	const filenameLabel = document.createElement("label");
	filenameLabel.htmlFor = "outputFilename";
	filenameLabel.textContent = "Result filename";
	const filenameInput = document.createElement("input");
	filenameInput.id = "outputFilename";
	filenameInput.name = "outputFilename";
	filenameInput.type = "text";
	filenameInput.value = suggestedOutputName(state.tool);
	filenameInput.maxLength = 120;
	filenameInput.autocomplete = "off";
	filenameInput.spellcheck = false;
	filenameInput.required = true;
	filenameInput.addEventListener("input", () => {
		state.filenameTouched = true;
	});
	filenameGroup.append(filenameLabel, filenameInput);
	elements.options.append(filenameGroup);
	updateFilenameHint();
	updateProtectionFields();
}

function outputExtension() {
	if (state.tool === "split") return "zip";
	if (state.tool === "fromPdf") return readOptions().format || "docx";
	if (state.tool === "protection") {
		const filename = state.files.get("file")?.name ?? "";
		return filename.split(".").pop()?.toLowerCase() || "pdf";
	}
	return "pdf";
}

function suggestedOutputName(toolName) {
	switch (toolName) {
		case "merge": return "merged";
		case "split": return "split-pages";
		case "extract": return "extracted-pages";
		case "rotate": return "rotated";
		case "protection": return "protected-document";
		default: return "document";
	}
}

function updateProtectionFields() {
	if (state.tool !== "protection") return;
	const action = document.querySelector("#option-action")?.value ?? "add";
	const fileInput = elements.fields.querySelector('input[data-field="file"]');
	const field = tools.protection.fields[0];
	const restrictionsOnly = action === "remove-restrictions";
	fileInput.accept = restrictionsOnly ? ".docx,.xlsx" : field.accept;
	for (const wrapper of elements.options.querySelectorAll("[data-show-when]")) {
		const visible = wrapper.dataset.showWhen === action;
		wrapper.hidden = !visible;
		wrapper.querySelector("input").required = visible;
		if (!visible) wrapper.querySelector("input").value = "";
	}
	const actionLabels = {
		add: "Protect document",
		"remove-password": "Remove file-open password",
		"remove-restrictions": "Remove editing restrictions"
	};
	elements.submitLabel.textContent = actionLabels[action];
}

function updateFilenameHint() {
	const group = document.querySelector(".output-name-group");
	if (!group) return;
	let hint = group.querySelector(".field-note");
	if (!hint) {
		hint = document.createElement("div");
		hint.className = "field-note";
		group.append(hint);
	}
	hint.textContent = `The .${outputExtension()} extension will be added automatically.`;
}

function resultFilename() {
	const input = document.querySelector("#outputFilename");
	const extension = outputExtension();
	let base = input?.value.trim() ?? "";
	base = base.replace(new RegExp(`\\.${extension}$`, "i"), "");
	base = base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim();
	if (!base) {
		throw new Error("Enter a valid result filename.");
	}
	if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(base)) {
		throw new Error("Choose a filename other than a reserved Windows device name.");
	}
	return `${base}.${extension}`;
}

function renderMergeField(field) {
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
	input.multiple = true;
	input.setAttribute("aria-label", field.label);
	const icon = document.createElement("span");
	icon.className = "upload-icon";
	icon.setAttribute("aria-hidden", "true");
	icon.textContent = "↑";
	const copy = document.createElement("span");
	copy.className = "drop-copy";
	const filename = document.createElement("strong");
	filename.textContent = "Drop PDFs here or browse";
	const helper = document.createElement("span");
	helper.textContent = field.help;
	copy.append(filename, helper);
	const browse = document.createElement("span");
	browse.className = "browse-link";
	browse.textContent = "Browse files";
	drop.append(input, icon, copy, browse);
	const list = document.createElement("div");
	list.className = "merge-file-list";
	list.setAttribute("aria-label", "PDF merge order");
	wrapper.append(label, drop, list);
	elements.fields.append(wrapper);

	input.addEventListener("change", () => {
		addMergeFiles(Array.from(input.files ?? []), helper);
		input.value = "";
	});
	drop.addEventListener("dragover", event => {
		event.preventDefault();
		drop.classList.add("dragging");
	});
	drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
	drop.addEventListener("drop", event => {
		event.preventDefault();
		drop.classList.remove("dragging");
		addMergeFiles(Array.from(event.dataTransfer?.files ?? []), helper);
	});
	renderMergeFiles(list, filename, helper, drop);
}

function addMergeFiles(files, helper) {
	const rejected = [];
	let totalSize = state.mergeFiles.reduce((total, file) => total + file.size, 0);
	for (const file of files) {
		if (!isPdf(file)) {
			rejected.push(`${file.name} is not a PDF.`);
			continue;
		}
		if (file.size > 50 * 1024 * 1024) {
			rejected.push(`${file.name} is over the 50 MB per-file limit.`);
			continue;
		}
		if (totalSize + file.size > 100 * 1024 * 1024) {
			rejected.push(`${file.name} would exceed the 100 MB total upload limit.`);
			continue;
		}
		state.mergeFiles.push(file);
		totalSize += file.size;
	}
	renderMergeFiles(
		document.querySelector(".merge-file-list"),
		document.querySelector(".drop-copy strong"),
		helper ?? document.querySelector(".drop-copy span"),
		document.querySelector(".dropzone")
	);
	elements.error.hidden = true;
	if (rejected.length > 0) showError(rejected.join(" "));
}

function renderMergeFiles(list, filename, helper, drop) {
	if (!list || !filename || !helper || !drop) return;
	list.replaceChildren();
	if (state.mergeFiles.length === 0) {
		filename.textContent = "Drop PDFs here or browse";
		helper.textContent = "Select multiple PDFs · up to 50 MB each";
		drop.classList.remove("has-file");
		return;
	}
	const totalSize = state.mergeFiles.reduce((total, file) => total + file.size, 0);
	filename.textContent = `${state.mergeFiles.length} PDF${state.mergeFiles.length === 1 ? "" : "s"} selected`;
	helper.textContent = `${formatSize(totalSize)} total · Arrange the merge order below`;
	drop.classList.add("has-file");

	state.mergeFiles.forEach((file, index) => {
		const row = document.createElement("div");
		row.className = "merge-file-row";
		const badge = document.createElement("span");
		badge.className = "merge-file-badge";
		badge.textContent = "PDF";
		const details = document.createElement("span");
		details.className = "merge-file-details";
		const name = document.createElement("strong");
		name.textContent = file.name;
		name.title = file.name;
		const size = document.createElement("span");
		size.textContent = formatSize(file.size);
		details.append(name, size);

		const controls = document.createElement("span");
		controls.className = "merge-file-controls";
		for (const [label, text, offset] of [
			[`Move ${file.name} up`, "↑", -1],
			[`Move ${file.name} down`, "↓", 1]
		]) {
			const move = document.createElement("button");
			move.type = "button";
			move.className = "merge-order-button";
			move.textContent = text;
			move.setAttribute("aria-label", label);
			move.disabled = index + offset < 0 || index + offset >= state.mergeFiles.length;
			move.addEventListener("click", () => {
				const nextIndex = index + offset;
				[state.mergeFiles[index], state.mergeFiles[nextIndex]] =
					[state.mergeFiles[nextIndex], state.mergeFiles[index]];
				renderMergeFiles(list, filename, helper, drop);
			});
			controls.append(move);
		}

		const remove = document.createElement("button");
		remove.type = "button";
		remove.className = "merge-remove-button";
		remove.textContent = "×";
		remove.setAttribute("aria-label", `Remove ${file.name}`);
		remove.addEventListener("click", () => {
			state.mergeFiles.splice(index, 1);
			renderMergeFiles(list, filename, helper, drop);
		});
		controls.append(remove);
		row.append(badge, details, controls);
		list.append(row);
	});
}

function setFile(key, file, input, drop, filename, helper) {
	if (file.size > 50 * 1024 * 1024) {
		showError(`${file.name} is over the 50 MB file limit.`);
		input.value = "";
		state.files.delete(key);
		return;
	}
	state.files.set(key, file);
	if (key === "file" && !state.filenameTouched
		&& ["view", "toPdf", "fromPdf", "protection"].includes(state.tool)) {
		const outputInput = document.querySelector("#outputFilename");
		if (outputInput) {
			outputInput.value = file.name.replace(/\.[^.]+$/, "");
		}
	}
	updateFilenameHint();
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
	return Object.fromEntries([...elements.options.querySelectorAll("input, select")]
		.map(input => [input.name, input.type === "password" ? input.value : input.value.trim()]));
}

function validateForm() {
	if (state.tool === "merge") {
		if (state.mergeFiles.length < 2) return "Choose at least two PDF files to merge.";
		const totalSize = state.mergeFiles.reduce((total, file) => total + file.size, 0);
		if (totalSize > 100 * 1024 * 1024) return "The combined PDF upload cannot exceed 100 MB.";
		return "";
	}
	const config = tools[state.tool];
	const needed = config.fields.map(field => [field, state.files.get(field.key)]);
	const missing = needed.find(([, file]) => !file);
	if (missing) return `Choose a file for “${missing[0].label}” first.`;
	for (const [field, file] of needed) {
		if (!field.extensions && (field.accept.includes("application/pdf") || field.accept.includes(".pdf")) && !isPdf(file)) {
			return `${field.label} must be a PDF file.`;
		}
		if (field.extensions && !field.extensions.some(extension => file.name.toLowerCase().endsWith(extension))) {
			return `${field.label} must be a PDF, DOCX, XLSX, or PPTX file.`;
		}
	}
	const options = readOptions();
	if (state.tool === "protection") {
		if (options.action === "add" && options.password !== options.confirmPassword) {
			return "The new password and confirmation do not match.";
		}
		if (options.action === "add" && !options.password.trim()) return "Enter a new password.";
		if (options.action === "remove-password" && !options.currentPassword.trim()) {
			return "Enter the current file-open password. Use the editing-restrictions action to unlock Word or Excel editing locks.";
		}
		if (options.action === "remove-restrictions"
			&& ![".docx", ".xlsx"].some(extension => state.files.get("file").name.toLowerCase().endsWith(extension))) {
			return "Password-free editing-restriction removal supports only unencrypted DOCX and XLSX files.";
		}
	}
	if (options.page && (!Number.isInteger(Number(options.page)) || Number(options.page) < 1)) return "Enter a page number greater than zero.";
	if (options.pages && !/^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/.test(options.pages)) return "Enter pages as numbers or ranges, for example 1,3-5.";
	try {
		resultFilename();
	} catch (error) {
		return error.message;
	}
	return "";
}

function buildRequest() {
	const file = state.files.get("file");
	const options = readOptions();
	const form = new FormData();
	let url;
	const outputName = resultFilename();
	let outputType;
	switch (state.tool) {
		case "view":
			form.append("file", file);
			url = "/api/pdf/info";
			break;
		case "merge":
			for (const mergeFile of state.mergeFiles) {
				form.append("files", mergeFile);
			}
			url = "/api/pdf/merge";
			outputType = "application/pdf";
			break;
		case "split":
			form.append("file", file);
			url = "/api/pdf/split";
			outputType = "application/zip";
			break;
		case "extract":
			form.append("file", file);
			form.append("pages", options.pages);
			url = "/api/pdf/extract";
			outputType = "application/pdf";
			break;
		case "rotate":
			form.append("file", file);
			form.append("page", options.page);
			form.append("degrees", options.degrees);
			url = "/api/pdf/rotate";
			outputType = "application/pdf";
			break;
		case "toPdf":
			form.append("file", file);
			url = "/api/convert/to-pdf";
			outputType = "application/pdf";
			break;
		case "fromPdf":
			form.append("file", file);
			form.append("format", options.format);
			url = "/api/convert/from-pdf";
			outputType = options.format === "txt" ? "text/plain" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
			break;
		case "protection":
			form.append("file", file);
			if (options.action === "add") {
				form.append("password", options.password);
				url = "/api/protection/add";
			} else if (options.action === "remove-password") {
				form.append("currentPassword", options.currentPassword);
				url = "/api/protection/remove";
			} else {
				url = "/api/protection/remove-restrictions";
			}
			outputType = file.type || (outputExtension() === "pdf" ? "application/pdf" : "application/octet-stream");
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
			appendDownload(new Blob([state.files.get("file")], { type: "application/pdf" }),
				request.outputName, "application/pdf");
			await renderPage(state.files.get("file"), 1, info.pageCount);
		} else {
			const blob = await response.blob();
			showDownload(blob, request.outputName, request.outputType, state.tool === "fromPdf" && request.outputType === "text/plain");
			if (request.outputType === "application/pdf" && state.tool !== "protection") {
				const file = new File([blob], request.outputName, { type: "application/pdf" });
				await inspectResultPdf(file);
			} else if (request.outputType === "application/zip") {
				showPreviewPlaceholder("Your split files are ready", "Download the ZIP to access each page as a separate PDF.");
			} else if (state.tool === "protection") {
				const action = readOptions().action;
				const message = action === "add" ? "Your document is protected"
					: action === "remove-restrictions" ? "Editing restrictions removed" : "Your document is unlocked";
				showPreviewPlaceholder(message,
					"Download the updated document using the filename you selected.");
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

function setLoading(loading) {
	elements.submit.disabled = loading;
	const action = state.tool === "protection" ? document.querySelector("#option-action")?.value : null;
	const defaultLabel = action === "remove" ? "Remove password" : tools[state.tool].button;
	elements.submitLabel.textContent = loading ? "Working on your document…" : defaultLabel;
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
	elements.result.hidden = false;
	elements.resultTitle.textContent = "Your file is ready";
	elements.resultContent.replaceChildren();
	if (showText) {
		const preview = document.createElement("pre");
		preview.className = "plain-output";
		blob.text().then(text => { preview.textContent = text || "No selectable text was found in this PDF."; });
		elements.resultContent.append(preview);
	}
	appendDownload(blob, filename, type);
}

function appendDownload(blob, filename, type) {
	if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
	state.downloadUrl = URL.createObjectURL(new Blob([blob], { type }));
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
const savedApiUrl = localStorage.getItem("paperplane-api-url");
elements.apiUrl.value = savedApiUrl === "http://localhost:8080"
	? "http://localhost:7000"
	: savedApiUrl || (["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port === "6999"
		? elements.apiUrl.value
		: window.location.origin);
elements.apiUrl.addEventListener("change", () => {
	localStorage.setItem("paperplane-api-url", apiBase());
	elements.apiIndicator.style.background = "#55b27c";
});
switchTool("view");
