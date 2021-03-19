/*
 * This code is as simple as possible without frameworks or corner-case compatibility or imports
 */

var zip = undefined;
var supported = ((window.File && window.FileList && window.FileReader) && (new XMLHttpRequest()).upload);
var filename = "";
var dragHandler = {};

// set up drag and drop to read file, prevent internal drag
if (supported) {
	dragHandler.IsOver = false;
	dragHandler.DragEnter = function (e) {
		if (e.dataTransfer.effectAllowed == "move") return;
		e.preventDefault();
		dragHandler.IsOver=true;
		setTimeout(function(){dragHandler.IsOver=false},0);
		document.body.classList.add('drag-over');
	};
	dragHandler.DragOver = function (e) {
		e.preventDefault();
	};
	dragHandler.DragLeave = function (e) {
		if (e.dataTransfer.effectAllowed == "move") return;
		if (!dragHandler.IsOver) {
			document.body.classList.remove('drag-over');
		}
		dragHandler.IsOver = false;
	};
	dragHandler.UploadFile = function (event) {
		dragHandler.LoadFile(event.target.files[0]);
	}
	dragHandler.LoadFile = function (file) {
		document.body.classList.remove('drag-over');
		if (!file.type === "application/pdf") return;
		var reader = new FileReader();
		reader.onload = function (event) {
			process(event.target.result, file.name);
		}
		reader.readAsArrayBuffer(file); // readAsDataURL
	}
	dragHandler.Drop = function (e) {
		if (e.dataTransfer.effectAllowed == "move") return;
		e.preventDefault();
		dragHandler.IsOver = false;
		if (e.dataTransfer.files.length) {
			for (var i=0;i<e.dataTransfer.files.length;i++) {
				dragHandler.LoadFile(e.dataTransfer.files[i]);
			}
		}
	}
	dragHandler.DragStart = function (e) {
		e.dataTransfer.effectAllowed = "move";
	}
	document.body.addEventListener("dragenter", dragHandler.DragEnter, false);
	document.body.addEventListener("dragover", dragHandler.DragOver, false);
	document.body.addEventListener("dragleave", dragHandler.DragLeave, false);
	document.body.addEventListener("drop", dragHandler.Drop, false);
	document.body.addEventListener("dragstart", dragHandler.DragStart, false);
}

// user has selected a pdf file, so ...
function process(ab, name) {

	filename = name;

	// load the zip package
	fetch('package.zip')

		// then get the array buffer
		.then(function(response) {
			return response.arrayBuffer();
		})

		// then load the zip
		.then(function(ab) {
			return zip.loadAsync(ab);
		})

		// make sure we don't have the __MACOS folder
		.then(function(obj) {
			return obj.remove("__MACOSX");
		})

		// then add the pdf to the zip
		.then(function(obj) {
			return obj.file(name, ab);
		})

		// then find files we need to update
		.then(function(package) {
			var fixes = [];
			package.forEach(function(relativePath,file) {
				switch(relativePath) {
					case "web/viewer.js":
					case "imsmanifest.xml":

						// create a promise that we will be processing this file
						fixes.push(new Promise(function(resolve,reject) {

							// extract the file directly from within the zip
							file
								.async("string")
								.then(function(content) {

									// do some simple string replacements
									return content
												.replaceAll('{{timestamp}}', (new Date().getTime()).toString(36))
												.replaceAll('{{pdfname}}', name);
								})

								// put it back into the zip
								.then(function(content) {
									package.file(relativePath, content);

									// mark this promise as resolved
									resolve();
								});
						}));
				}
			})

			// all the promises need to resolve in order to continue
			return Promise.all(fixes);
		})

		// then download the package
		.then(download);
}

// set up any objects
function main(event) {
	if (!supported) return alert('Sorry, this app requires a browser from THIS DECADE.');
	zip = new JSZip();
}

// download the package
function download(package) {
	if (!supported) return;
	zip.generateAsync({type:"blob"})
	.then(function (blob) {
	    saveAs(blob, filename + "-to-scorm.zip");
	});
}

// event listeners
document.addEventListener('DOMContentLoaded', main);
document.querySelector('input[type="file"]').addEventListener('change', dragHandler.UploadFile);

// um, yeah, that's the whole app.