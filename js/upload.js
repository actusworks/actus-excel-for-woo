/**
 * Actus Upload - Drag & Drop Upload Module
 * Modern drag and drop file upload functionality
 */

const $ = window.jQuery || jQuery;


class ActusUpload {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            maxFileSize		: options.maxFileSize || 10 * 1024 * 1024, // 10MB default
            allowedTypes	: options.allowedTypes || ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            multiple		: options.multiple !== false, // true by default
            uploadUrl		: options.uploadUrl,
            instantUpload   : true,
            //action			: options.action || 'acex_upload_file',
            action			: options.action,
            nonce			: options.nonce || '',
            onUploadStart	: options.onUploadStart || (() => {}),
            onUploadProgress: options.onUploadProgress || (() => {}),
            onUploadComplete: options.onUploadComplete || (() => {}),
            onUploadError	: options.onUploadError || (() => {}),
            ...options
        };
        
        this.files = [];
        this.isUploading = false;
        
        // Store bound functions for cleanup
        this.boundHandlers = {
            preventDefaults: this.preventDefaults.bind(this),
            highlight: this.highlight.bind(this),
            unhighlight: this.unhighlight.bind(this),
            handleDrop: this.handleDrop.bind(this)
        };

        this.init();
    }
    
    init() {
        this.createUploadArea();
        this.bindEvents();
    }


    destroy() {
        // Check if boundHandlers exists before trying to remove listeners
        if (!this.boundHandlers) {
            return;
        }
        
        const events = ['dragenter', 'dragover', 'dragleave', 'drop'];
        
        // Remove all event listeners
        events.forEach(eventName => {
            if (this.uploadZone) {
                this.uploadZone.removeEventListener(eventName, this.boundHandlers.preventDefaults, false);
            }
            document.body.removeEventListener(eventName, this.boundHandlers.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            if (this.uploadZone) {
                this.uploadZone.removeEventListener(eventName, this.boundHandlers.highlight, false);
            }
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            if (this.uploadZone) {
                this.uploadZone.removeEventListener(eventName, this.boundHandlers.unhighlight, false);
            }
        });
        
        if (this.uploadZone) {
            this.uploadZone.removeEventListener('drop', this.boundHandlers.handleDrop, false);
        }
        
        if ( this.container ) this.container.innerHTML = '';
        // Clear references
        
        this.uploadZone = null;
        this.uploadInput = null;
        this.browseBtn = null;
        this.filesContainer = null;
        this.actionsContainer = null;
        this.submitBtn = null;
        this.clearBtn = null;
        this.files = [];
        this.boundHandlers = null;
        
    }


    
    createUploadArea() {
        this.container.innerHTML = `
            <div class="actus-upload-area">
                <div class="actus-upload-zone" data-state="idle">
                    <div class="actus-upload-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14,2 14,8 20,8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                    </div>
                    <div class="actus-upload-text">
                        <h3>Drop your files here</h3>
                        <p>or <button type="button" class="actus-upload-browse">browse files</button></p>
                        <small>Supports CSV, XLS, XLSX files up to ${this.formatFileSize(this.options.maxFileSize)}</small>
                    </div>
                    <input type="file" class="actus-upload-input" ${this.options.multiple ? 'multiple' : ''} accept="${this.options.allowedTypes.join(',')}">
                </div>
                
                <div class="actus-upload-files"></div>
                
                <div class="actus-upload-actions" style="display: none;">
                    <button type="button" class="actus-btn actus-btn-primary actus-upload-submit">
                        <span class="actus-btn-text">Upload Files</span>
                        <span class="actus-btn-loader" style="display: none;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.56 1.23"></path>
                            </svg>
                        </span>
                    </button>
                    <button type="button" class="actus-btn actus-btn-secondary actus-upload-clear">Clear All</button>
                </div>
            </div>
        `;
        
        // Get references to elements
        this.uploadZone = this.container.querySelector('.actus-upload-zone');
        this.uploadInput = this.container.querySelector('.actus-upload-input');
        this.browseBtn = this.container.querySelector('.actus-upload-browse');
        this.filesContainer = this.container.querySelector('.actus-upload-files');
        this.actionsContainer = this.container.querySelector('.actus-upload-actions');
        this.submitBtn = this.container.querySelector('.actus-upload-submit');
        this.clearBtn = this.container.querySelector('.actus-upload-clear');
    }
    
    bindEvents() {
        const events = ['dragenter', 'dragover', 'dragleave', 'drop'];
        
        // Drag and drop events
        events.forEach(eventName => {
            this.uploadZone.addEventListener(eventName, this.boundHandlers.preventDefaults, false);
            document.body.addEventListener(eventName, this.boundHandlers.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, this.boundHandlers.highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.uploadZone.addEventListener(eventName, this.boundHandlers.unhighlight, false);
        });

        this.uploadZone.addEventListener('drop', this.boundHandlers.handleDrop, false);

        // File input and browse button
        this.uploadInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.browseBtn.addEventListener('click', () => this.uploadInput.click());
        
        // Action buttons
        this.submitBtn.addEventListener('click', this.uploadFiles.bind(this));
        this.clearBtn.addEventListener('click', this.clearFiles.bind(this));
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    highlight() {
        this.uploadZone.dataset.state = 'dragover';
    }
    
    unhighlight() {
        this.uploadZone.dataset.state = 'idle';
    }
    
    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        this.handleFiles(files);
    }
    
    handleFileSelect(e) {
        this.handleFiles(e.target.files);
    }
    
    handleFiles(fileList) {
        const files = Array.from(fileList);
//console.log('1 ======', files[0])
        files.forEach(file => {
            if (this.validateFile(file)) {
                this.addFile(file);
            }
        });
//console.log('2 ======', this.files[0])
        
        if ( this.options.instantUpload ) {
            this.uploadFiles();
        } else {
            this.updateUI();
        }
    }
    
    validateFile(file) {
        // Check file size
        if (file.size > this.options.maxFileSize) {
            this.showError(`File "${file.name}" is too large. Maximum size is ${this.formatFileSize(this.options.maxFileSize)}.`);
            return false;
        }
        
        // Check file type
        if (!this.options.allowedTypes.includes(file.type)) {
            // Also check file extension as backup
            const extension = file.name.split('.').pop().toLowerCase();
            const allowedExtensions = ['csv', 'xls', 'xlsx'];
            if (!allowedExtensions.includes(extension)) {
                this.showError(`File "${file.name}" is not supported. Please upload CSV, XLS, or XLSX files.`);
                return false;
            }
        }
        
        // Check if file already exists
        if (this.files.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
            this.showError(`File "${file.name}" is already selected.`);
            return false;
        }
        
        return true;
    }
    
    addFile(file) {
        const fileObj = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size,
            status: 'pending',
            progress: 0
        };
        
        this.files.push(fileObj);
    }
    
    removeFile(fileId) {
        this.files = this.files.filter(file => file.id !== fileId);
        this.updateUI();
    }
    
    clearFiles() {
        this.files = [];
        this.updateUI();
    }
    
    updateUI() {
        // Update files list
        this.renderFiles();
        
        // Show/hide actions
        if (this.files.length > 0) {
            this.actionsContainer.style.display = 'flex';
            this.uploadZone.dataset.state = 'has-files';
        } else {
            this.actionsContainer.style.display = 'none';
            this.uploadZone.dataset.state = 'idle';
        }
    }
    
    renderFiles() {
        this.filesContainer.innerHTML = this.files.map(file => `
            <div class="actus-file-item" data-status="${file.status}">
                <div class="actus-file-icon">
                    ${this.getFileIcon(file.name)}
                </div>
                <div class="actus-file-info">
                    <div class="actus-file-name">${file.name}</div>
                    <div class="actus-file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <div class="actus-file-progress">
                    <div class="actus-progress-bar">
                        <div class="actus-progress-fill" style="width: ${file.progress}%"></div>
                    </div>
                    <span class="actus-progress-text">${file.progress}%</span>
                </div>
                <div class="actus-file-status">
                    ${this.getStatusIcon(file.status)}
                </div>
                <button type="button" class="actus-file-remove" onclick="window.acexUpload.removeFile(${file.id})" ${file.status === 'uploading' ? 'disabled' : ''}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `).join('');
    }
    
    getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const icons = {
            csv: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#10b981"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
            xls: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
            xlsx: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#059669"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
        };
        return icons[extension] || icons.csv;
    }
    
    getStatusIcon(status) {
        const icons = {
            pending: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#6b7280"><circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline></svg>`,
            uploading: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" class="actus-spin"><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.56 1.23"></path></svg>`,
            success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline></svg>`,
            error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
        };
        return icons[status] || icons.pending;
    }
    
    async uploadFiles() {
        if (this.isUploading || this.files.length === 0) return;
        
        this.isUploading = true;
        this.updateUploadButton(true);
        
        this.options.onUploadStart(this.files);
            
            
        // If no server action, just trigger completion and return
        if (!this.options.action) {
            this.isUploading = false;
            this.updateUploadButton(false);
            this.options.onUploadComplete(this.files);
            this.clearFiles();
            return; // ← Add this return to prevent continuing
        }

        
         // Server upload logic
        for (const fileObj of this.files) {
            if (fileObj.status === 'success') continue;
            
            try {
            
                await this.uploadSingleFile(fileObj);

            } catch (error) {
                console.error('Upload error:', error);
                fileObj.status = 'error';
                this.options.onUploadError(error, fileObj);
            }
        }
        
        this.isUploading = false;
        this.updateUploadButton(false);
        this.options.onUploadComplete(this.files);
        this.clearFiles();
    }
    
    uploadSingleFile(fileObj) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('action', this.options.action);
            formData.append('file', fileObj.file);
            formData.append('nonce', this.options.nonce);
            
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    fileObj.progress = Math.round((e.loaded / e.total) * 100);
                    this.options.onUploadProgress(fileObj);
                    this.updateUI();
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            fileObj.status = 'success';
                            fileObj.progress = 100;
                            fileObj.response = response.data;
                            resolve(response);
                        } else {
                            throw new Error(response.data || 'Upload failed');
                        }
                    } catch (error) {
                        fileObj.status = 'error';
                        reject(error);
                    }
                } else {
                    fileObj.status = 'error';
                    reject(new Error(`HTTP Error: ${xhr.status}`));
                }
                this.updateUI();
            });
            
            xhr.addEventListener('error', () => {
                fileObj.status = 'error';
                reject(new Error('Network error'));
                this.updateUI();
            });
            
            fileObj.status = 'uploading';
            this.updateUI();
            
            xhr.open('POST', this.options.uploadUrl);
            xhr.send(formData);
        });
    }
    
    updateUploadButton(isUploading) {
        const btnText = this.submitBtn.querySelector('.actus-btn-text');
        const btnLoader = this.submitBtn.querySelector('.actus-btn-loader');
        
        if (isUploading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            this.submitBtn.disabled = true;
        } else {
            btnText.style.display = 'inline-block';
            btnLoader.style.display = 'none';
            this.submitBtn.disabled = false;
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showError(message) {
        // Create or update error message
        let errorEl = this.container.querySelector('.actus-upload-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'actus-upload-error';
            this.container.insertBefore(errorEl, this.container.firstChild);
        }
        
        errorEl.innerHTML = `
            <div class="actus-alert actus-alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <span>${message}</span>
                <button type="button" class="actus-alert-close">&times;</button>
            </div>
        `;
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            if (errorEl.parentNode) {
                errorEl.remove();
            }
        }, 5000);
        
        // Close button
        errorEl.querySelector('.actus-alert-close').addEventListener('click', () => {
            errorEl.remove();
        });
    }
}


/*

// Initialize upload area when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const uploadContainer = document.querySelector('.actus-upload-container');
    if (uploadContainer) {
        window.acexUpload = new ActusUpload(uploadContainer, {
            uploadUrl: ajaxurl,
            action: 'acex_upload_file',
            nonce: acex_ajax.nonce,
            onUploadComplete: function(files) {
                console.log('Upload complete:', files);
                // You can add custom completion logic here
            },
            onUploadError: function(error, file) {
                console.error('Upload error:', error, file);
            }
        });
    }
});

*/




export default ActusUpload;

