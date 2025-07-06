class ImageEditor {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.originalImage = null;
    this.currentImage = null;
    this.isEditing = false;
    this.cropMode = false;
    this.cropData = null;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.cropSelection = { x: 0, y: 0, width: 0, height: 0 };
    this.activeHandle = null;

    // Sistema de histórico
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 20;

    // Filtros expandidos
    this.filters = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
      exposure: 100,
      shadows: 100,
      highlights: 100,
      vibrance: 100,
      sharpness: 100,
    };

    this.initializeEventListeners();
    this.setupDragAndDrop();
    this.setupPasteHandler();
    this.setupCropHandlers();
    this.updateFilterValues();
  }

  initializeEventListeners() {
    // Botões principais
    document.getElementById("uploadBtn").addEventListener("click", () => {
      document.getElementById("fileInput").click();
    });

    document.getElementById("fileInput").addEventListener("change", (e) => {
      this.loadImage(e.target.files[0]);
    });

    document.getElementById("pasteBtn").addEventListener("click", () => {
      this.pasteFromClipboard();
    });

    document.getElementById("downloadBtn").addEventListener("click", () => {
      this.downloadImage();
    });

    // Botões de histórico
    document.getElementById("undoBtn").addEventListener("click", () => {
      this.undo();
    });

    document.getElementById("redoBtn").addEventListener("click", () => {
      this.redo();
    });

    // Botões de edição
    document.getElementById("cropBtn").addEventListener("click", () => {
      this.toggleCropMode();
    });

    document.getElementById("rotateBtn").addEventListener("click", () => {
      this.rotateImage(90);
    });

    document.getElementById("flipHBtn").addEventListener("click", () => {
      this.flipImage("horizontal");
    });

    document.getElementById("flipVBtn").addEventListener("click", () => {
      this.flipImage("vertical");
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
      this.resetImage();
    });

    // Controles de filtros
    const filterControls = [
      "brightness",
      "contrast",
      "saturation",
      "hue",
      "blur",
      "exposure",
      "shadows",
      "highlights",
      "vibrance",
      "sharpness",
    ];

    filterControls.forEach((filter) => {
      const element = document.getElementById(filter);
      if (element) {
        element.addEventListener("input", (e) => {
          this.filters[filter] = parseInt(e.target.value);
          this.updateFilterValue(filter, e.target.value);
          this.applyFilters();
        });
      }
    });

    // Controle de qualidade
    document.getElementById("quality").addEventListener("input", (e) => {
      this.updateFilterValue("quality", e.target.value);
    });

    // Filtros predefinidos
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.applyPresetFilter(e.target.dataset.filter);
        this.updateFilterButtons(e.target);
      });
    });
  }

  updateFilterValues() {
    const filterControls = [
      "brightness",
      "contrast",
      "saturation",
      "hue",
      "blur",
      "exposure",
      "shadows",
      "highlights",
      "vibrance",
      "sharpness",
      "quality",
    ];

    filterControls.forEach((filter) => {
      const element = document.getElementById(filter);
      if (element) {
        this.updateFilterValue(filter, element.value);
      }
    });
  }

  updateFilterValue(filter, value) {
    const valueSpan = document.querySelector(`#${filter} + span.value`);
    if (valueSpan) {
      const unit = filter === "hue" ? "°" : filter === "blur" ? "px" : "%";
      valueSpan.textContent = `${value}${unit}`;
    }
  }

  saveState() {
    if (!this.canvas) return;

    const imageData = this.canvas.toDataURL();
    const state = {
      imageData: imageData,
      filters: { ...this.filters },
      timestamp: Date.now(),
    };

    // Remove estados futuros se estamos no meio do histórico
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(state);

    // Limita o tamanho do histórico
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    this.updateHistoryButtons();
    this.updateHistoryCount();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreState(this.history[this.historyIndex]);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreState(this.history[this.historyIndex]);
    }
  }

  restoreState(state) {
    const img = new Image();
    img.onload = () => {
      this.currentImage = img;
      this.filters = { ...state.filters };
      this.updateFilterSliders();
      this.displayImage();
      this.updateHistoryButtons();
    };
    img.src = state.imageData;
  }

  updateHistoryButtons() {
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");

    undoBtn.disabled = this.historyIndex <= 0;
    redoBtn.disabled = this.historyIndex >= this.history.length - 1;
  }

  updateHistoryCount() {
    const historyCount = document.getElementById("historyCount");
    if (historyCount) {
      historyCount.textContent = `${this.history.length} ações`;
    }
  }

  setupDragAndDrop() {
    const dropZone = document.getElementById("dropZone");

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, this.preventDefaults, false);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(
        eventName,
        () => {
          dropZone.classList.add("dragover");
        },
        false
      );
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(
        eventName,
        () => {
          dropZone.classList.remove("dragover");
        },
        false
      );
    });

    dropZone.addEventListener(
      "drop",
      (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.loadImage(files[0]);
        }
      },
      false
    );
  }

  setupPasteHandler() {
    document.addEventListener("paste", (e) => {
      const items = e.clipboardData.items;
      for (let item of items) {
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          this.loadImage(file);
          break;
        }
      }
    });
  }

  setupCropHandlers() {
    const cropOverlay = document.getElementById("cropOverlay");

    cropOverlay.addEventListener("mousedown", (e) => {
      if (this.cropMode) {
        this.handleCropMouseDown(e);
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (this.cropMode && this.isDragging) {
        this.handleCropMouseMove(e);
      }
    });

    document.addEventListener("mouseup", () => {
      if (this.cropMode) {
        this.handleCropMouseUp();
      }
    });
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  loadImage(file) {
    if (!file || !file.type.startsWith("image/")) {
      this.showNotification(
        "Por favor, selecione um arquivo de imagem válido.",
        "error"
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.currentImage = img;
        this.displayImage();
        this.showImageInfo(file);
        this.hideDropZone();
        this.enableControls();
        this.saveState();
        this.showNotification("Imagem carregada com sucesso!", "success");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  displayImage() {
    if (!this.currentImage) return;

    const maxWidth = 900;
    const maxHeight = 700;

    let { width, height } = this.currentImage;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width *= ratio;
      height *= ratio;
    }

    this.canvas.width = width;
    this.canvas.height = height;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(this.currentImage, 0, 0, width, height);

    this.applyFilters();
  }

  applyFilters() {
    if (!this.currentImage) return;

    const {
      brightness,
      contrast,
      saturation,
      hue,
      blur,
      exposure,
      shadows,
      highlights,
      vibrance,
      sharpness,
    } = this.filters;

    let filterString = "";
    if (brightness !== 100) filterString += `brightness(${brightness}%) `;
    if (contrast !== 100) filterString += `contrast(${contrast}%) `;
    if (saturation !== 100) filterString += `saturate(${saturation}%) `;
    if (hue !== 0) filterString += `hue-rotate(${hue}deg) `;
    if (blur > 0) filterString += `blur(${blur}px) `;

    // Filtros avançados simulados
    if (exposure !== 100) filterString += `brightness(${exposure}%) `;
    if (vibrance !== 100) filterString += `saturate(${vibrance}%) `;

    this.ctx.filter = filterString;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(
      this.currentImage,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    this.ctx.filter = "none";
  }

  applyPresetFilter(filterType) {
    this.resetFilters();

    switch (filterType) {
      case "none":
        // Já resetado
        break;
      case "grayscale":
        this.filters.saturation = 0;
        break;
      case "sepia":
        this.filters.saturation = 80;
        this.filters.hue = 30;
        this.filters.brightness = 110;
        break;
      case "vintage":
        this.filters.contrast = 120;
        this.filters.saturation = 80;
        this.filters.brightness = 95;
        this.filters.exposure = 110;
        break;
      case "cold":
        this.filters.hue = 200;
        this.filters.saturation = 120;
        this.filters.brightness = 105;
        break;
      case "warm":
        this.filters.hue = 20;
        this.filters.brightness = 110;
        this.filters.saturation = 110;
        break;
      case "dramatic":
        this.filters.contrast = 150;
        this.filters.brightness = 90;
        this.filters.saturation = 120;
        this.filters.shadows = 80;
        break;
      case "noir":
        this.filters.saturation = 0;
        this.filters.contrast = 140;
        this.filters.brightness = 85;
        break;
      case "cyberpunk":
        this.filters.hue = 280;
        this.filters.saturation = 150;
        this.filters.contrast = 130;
        this.filters.brightness = 110;
        break;
      case "golden":
        this.filters.hue = 45;
        this.filters.brightness = 115;
        this.filters.saturation = 120;
        this.filters.exposure = 110;
        break;
    }

    this.updateFilterSliders();
    this.applyFilters();
    this.saveState();
  }

  resetFilters() {
    this.filters = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
      exposure: 100,
      shadows: 100,
      highlights: 100,
      vibrance: 100,
      sharpness: 100,
    };
  }

  updateFilterSliders() {
    Object.keys(this.filters).forEach((filter) => {
      const element = document.getElementById(filter);
      if (element) {
        element.value = this.filters[filter];
        this.updateFilterValue(filter, this.filters[filter]);
      }
    });
  }

  updateFilterButtons(activeBtn) {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    activeBtn.classList.add("active");
  }

  rotateImage(degrees) {
    if (!this.currentImage) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (degrees === 90 || degrees === 270) {
      canvas.width = this.currentImage.height;
      canvas.height = this.currentImage.width;
    } else {
      canvas.width = this.currentImage.width;
      canvas.height = this.currentImage.height;
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(
      this.currentImage,
      -this.currentImage.width / 2,
      -this.currentImage.height / 2
    );

    const img = new Image();
    img.onload = () => {
      this.currentImage = img;
      this.displayImage();
      this.saveState();
      this.showNotification("Imagem rotacionada!", "success");
    };
    img.src = canvas.toDataURL();
  }

  flipImage(direction) {
    if (!this.currentImage) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = this.currentImage.width;
    canvas.height = this.currentImage.height;

    ctx.save();

    if (direction === "horizontal") {
      ctx.scale(-1, 1);
      ctx.drawImage(this.currentImage, -canvas.width, 0);
    } else {
      ctx.scale(1, -1);
      ctx.drawImage(this.currentImage, 0, -canvas.height);
    }

    ctx.restore();

    const img = new Image();
    img.onload = () => {
      this.currentImage = img;
      this.displayImage();
      this.saveState();
      this.showNotification(
        `Imagem espelhada ${
          direction === "horizontal" ? "horizontalmente" : "verticalmente"
        }!`,
        "success"
      );
    };
    img.src = canvas.toDataURL();
  }

  toggleCropMode() {
    this.cropMode = !this.cropMode;
    const cropBtn = document.getElementById("cropBtn");
    const cropOverlay = document.getElementById("cropOverlay");

    if (this.cropMode) {
      cropBtn.innerHTML = '<i class="fas fa-check"></i> Confirmar Crop';
      cropBtn.classList.add("success");
      cropOverlay.style.display = "block";
      this.initializeCropSelection();
      this.showNotification(
        "Modo de recorte ativado. Arraste para selecionar a área.",
        "info"
      );
    } else {
      cropBtn.innerHTML = '<i class="fas fa-crop"></i> Recortar';
      cropBtn.classList.remove("success");
      cropOverlay.style.display = "none";
      this.applyCrop();
    }
  }

  initializeCropSelection() {
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvas.parentElement.getBoundingClientRect();

    // Inicializa com 50% da imagem no centro
    const width = this.canvas.width * 0.5;
    const height = this.canvas.height * 0.5;
    const x = (this.canvas.width - width) / 2;
    const y = (this.canvas.height - height) / 2;

    this.cropSelection = { x, y, width, height };
    this.updateCropSelection();
  }

  updateCropSelection() {
    const cropSelection = document.querySelector(".crop-selection");
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvas.parentElement.getBoundingClientRect();

    const scaleX = canvasRect.width / this.canvas.width;
    const scaleY = canvasRect.height / this.canvas.height;

    const displayX = this.cropSelection.x * scaleX;
    const displayY = this.cropSelection.y * scaleY;
    const displayWidth = this.cropSelection.width * scaleX;
    const displayHeight = this.cropSelection.height * scaleY;

    cropSelection.style.left = `${displayX}px`;
    cropSelection.style.top = `${displayY}px`;
    cropSelection.style.width = `${displayWidth}px`;
    cropSelection.style.height = `${displayHeight}px`;

    // Atualiza informações do crop
    const cropDimensions = document.getElementById("cropDimensions");
    if (cropDimensions) {
      cropDimensions.textContent = `${Math.round(
        this.cropSelection.width
      )} × ${Math.round(this.cropSelection.height)}`;
    }
  }

  handleCropMouseDown(e) {
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvas.parentElement.getBoundingClientRect();

    const scaleX = this.canvas.width / canvasRect.width;
    const scaleY = this.canvas.height / canvasRect.height;

    const mouseX = (e.clientX - canvasRect.left) * scaleX;
    const mouseY = (e.clientY - canvasRect.top) * scaleY;

    // Verifica se clicou em um handle
    this.activeHandle = this.getActiveHandle(mouseX, mouseY);

    if (this.activeHandle || this.isInsideCropArea(mouseX, mouseY)) {
      this.isDragging = true;
      this.dragStart = { x: mouseX, y: mouseY };
      this.originalCropSelection = { ...this.cropSelection };
    } else {
      // Inicia nova seleção
      this.cropSelection = { x: mouseX, y: mouseY, width: 0, height: 0 };
      this.isDragging = true;
      this.dragStart = { x: mouseX, y: mouseY };
      this.activeHandle = "se"; // Simula arrastar do canto inferior direito
    }
  }

  handleCropMouseMove(e) {
    if (!this.isDragging) return;

    const canvasRect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / canvasRect.width;
    const scaleY = this.canvas.height / canvasRect.height;

    const mouseX = (e.clientX - canvasRect.left) * scaleX;
    const mouseY = (e.clientY - canvasRect.top) * scaleY;

    const deltaX = mouseX - this.dragStart.x;
    const deltaY = mouseY - this.dragStart.y;

    if (this.activeHandle) {
      this.resizeCropSelection(deltaX, deltaY);
    } else {
      // Move toda a seleção
      this.cropSelection.x = this.originalCropSelection.x + deltaX;
      this.cropSelection.y = this.originalCropSelection.y + deltaY;
    }

    // Limita aos bounds da imagem
    this.constrainCropSelection();
    this.updateCropSelection();
  }

  handleCropMouseUp() {
    this.isDragging = false;
    this.activeHandle = null;
    this.originalCropSelection = null;
  }

  getActiveHandle(mouseX, mouseY) {
    const handles = {
      nw: { x: this.cropSelection.x, y: this.cropSelection.y },
      ne: {
        x: this.cropSelection.x + this.cropSelection.width,
        y: this.cropSelection.y,
      },
      sw: {
        x: this.cropSelection.x,
        y: this.cropSelection.y + this.cropSelection.height,
      },
      se: {
        x: this.cropSelection.x + this.cropSelection.width,
        y: this.cropSelection.y + this.cropSelection.height,
      },
      n: {
        x: this.cropSelection.x + this.cropSelection.width / 2,
        y: this.cropSelection.y,
      },
      s: {
        x: this.cropSelection.x + this.cropSelection.width / 2,
        y: this.cropSelection.y + this.cropSelection.height,
      },
      e: {
        x: this.cropSelection.x + this.cropSelection.width,
        y: this.cropSelection.y + this.cropSelection.height / 2,
      },
      w: {
        x: this.cropSelection.x,
        y: this.cropSelection.y + this.cropSelection.height / 2,
      },
    };

    const tolerance = 15;

    for (const [handle, pos] of Object.entries(handles)) {
      const distance = Math.sqrt(
        Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2)
      );
      if (distance <= tolerance) {
        return handle;
      }
    }

    return null;
  }

  isInsideCropArea(mouseX, mouseY) {
    return (
      mouseX >= this.cropSelection.x &&
      mouseX <= this.cropSelection.x + this.cropSelection.width &&
      mouseY >= this.cropSelection.y &&
      mouseY <= this.cropSelection.y + this.cropSelection.height
    );
  }

  resizeCropSelection(deltaX, deltaY) {
    const original = this.originalCropSelection;

    switch (this.activeHandle) {
      case "nw":
        this.cropSelection.x = original.x + deltaX;
        this.cropSelection.y = original.y + deltaY;
        this.cropSelection.width = original.width - deltaX;
        this.cropSelection.height = original.height - deltaY;
        break;
      case "ne":
        this.cropSelection.y = original.y + deltaY;
        this.cropSelection.width = original.width + deltaX;
        this.cropSelection.height = original.height - deltaY;
        break;
      case "sw":
        this.cropSelection.x = original.x + deltaX;
        this.cropSelection.width = original.width - deltaX;
        this.cropSelection.height = original.height + deltaY;
        break;
      case "se":
        this.cropSelection.width = original.width + deltaX;
        this.cropSelection.height = original.height + deltaY;
        break;
      case "n":
        this.cropSelection.y = original.y + deltaY;
        this.cropSelection.height = original.height - deltaY;
        break;
      case "s":
        this.cropSelection.height = original.height + deltaY;
        break;
      case "e":
        this.cropSelection.width = original.width + deltaX;
        break;
      case "w":
        this.cropSelection.x = original.x + deltaX;
        this.cropSelection.width = original.width - deltaX;
        break;
    }

    // Garante dimensões mínimas
    if (this.cropSelection.width < 20) {
      this.cropSelection.width = 20;
      if (this.activeHandle.includes("w")) {
        this.cropSelection.x = original.x + original.width - 20;
      }
    }

    if (this.cropSelection.height < 20) {
      this.cropSelection.height = 20;
      if (this.activeHandle.includes("n")) {
        this.cropSelection.y = original.y + original.height - 20;
      }
    }
  }

  constrainCropSelection() {
    // Limita às dimensões da imagem
    if (this.cropSelection.x < 0) {
      this.cropSelection.width += this.cropSelection.x;
      this.cropSelection.x = 0;
    }

    if (this.cropSelection.y < 0) {
      this.cropSelection.height += this.cropSelection.y;
      this.cropSelection.y = 0;
    }

    if (this.cropSelection.x + this.cropSelection.width > this.canvas.width) {
      this.cropSelection.width = this.canvas.width - this.cropSelection.x;
    }

    if (this.cropSelection.y + this.cropSelection.height > this.canvas.height) {
      this.cropSelection.height = this.canvas.height - this.cropSelection.y;
    }
  }

  applyCrop() {
    if (!this.currentImage || !this.cropSelection) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = this.cropSelection.width;
    canvas.height = this.cropSelection.height;

    // Desenha a área recortada
    ctx.drawImage(
      this.canvas,
      this.cropSelection.x,
      this.cropSelection.y,
      this.cropSelection.width,
      this.cropSelection.height,
      0,
      0,
      this.cropSelection.width,
      this.cropSelection.height
    );

    const img = new Image();
    img.onload = () => {
      this.currentImage = img;
      this.displayImage();
      this.saveState();
      this.showNotification("Imagem recortada com sucesso!", "success");
    };
    img.src = canvas.toDataURL();
  }

  resetImage() {
    if (!this.originalImage) return;

    this.currentImage = this.originalImage;
    this.resetFilters();
    this.updateFilterSliders();
    this.displayImage();
    this.saveState();

    // Resetar botões de filtro
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Ativar botão "Original"
    const originalBtn = document.querySelector(
      '.filter-btn[data-filter="none"]'
    );
    if (originalBtn) {
      originalBtn.classList.add("active");
    }

    this.showNotification("Imagem resetada para o original!", "info");
  }

  async pasteFromClipboard() {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith("image/")) {
            const blob = await clipboardItem.getType(type);
            this.loadImage(blob);
            return;
          }
        }
      }
      this.showNotification(
        "Nenhuma imagem encontrada na área de transferência.",
        "warning"
      );
    } catch (err) {
      console.error("Erro ao acessar área de transferência:", err);
      this.showNotification(
        "Não foi possível acessar a área de transferência. Use Ctrl+V ou arraste uma imagem.",
        "error"
      );
    }
  }

  downloadImage() {
    if (!this.canvas) return;

    const format = document.getElementById("formatSelect").value;
    const quality = document.getElementById("quality").value / 100;

    let mimeType = "image/png";
    let filename = "imagena_editada.png";

    switch (format) {
      case "jpeg":
        mimeType = "image/jpeg";
        filename = "imagena_editada.jpg";
        break;
      case "webp":
        mimeType = "image/webp";
        filename = "imagena_editada.webp";
        break;
    }

    const link = document.createElement("a");
    link.download = filename;
    link.href = this.canvas.toDataURL(mimeType, quality);
    link.click();

    this.showNotification(`Imagem baixada como ${filename}!`, "success");
  }

  showImageInfo(file) {
    const info = document.getElementById("imageInfo");
    const dimensions = document.getElementById("imageDimensions");
    const size = document.getElementById("imageSize");
    const format = document.getElementById("imageFormat");

    dimensions.textContent = `${this.originalImage.width} × ${this.originalImage.height}px`;
    size.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    format.textContent = file.type.split("/")[1].toUpperCase();

    info.style.display = "block";
  }

  hideDropZone() {
    document.getElementById("dropZone").classList.add("hidden");
  }

  enableControls() {
    document.getElementById("downloadBtn").disabled = false;
    this.isEditing = true;
  }

  showNotification(message, type = "info") {
    // Cria elemento de notificação
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

    // Adiciona estilos
    Object.assign(notification.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      background: this.getNotificationColor(type),
      color: "white",
      padding: "15px 20px",
      borderRadius: "10px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      zIndex: "10000",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "14px",
      fontWeight: "500",
      transform: "translateX(400px)",
      transition: "transform 0.3s ease",
    });

    document.body.appendChild(notification);

    // Anima entrada
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 100);

    // Remove após 3 segundos
    setTimeout(() => {
      notification.style.transform = "translateX(400px)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  getNotificationIcon(type) {
    const icons = {
      success: "check-circle",
      error: "exclamation-circle",
      warning: "exclamation-triangle",
      info: "info-circle",
    };
    return icons[type] || "info-circle";
  }

  getNotificationColor(type) {
    const colors = {
      success: "#27ae60",
      error: "#e74c3c",
      warning: "#f39c12",
      info: "#3498db",
    };
    return colors[type] || "#3498db";
  }
}

// Função para gerenciar as abas de filtros
function initializeTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.dataset.tab;

      // Remove active de todos os botões e painéis
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanels.forEach((panel) => panel.classList.remove("active"));

      // Adiciona active ao botão e painel clicados
      button.classList.add("active");
      document.getElementById(targetTab).classList.add("active");
    });
  });
}

// Função para minimizar/expandir painel inferior
function initializePanelToggle() {
  const panelToggle = document.getElementById("panelToggle");
  const bottomPanel = document.querySelector(".bottom-panel");

  panelToggle.addEventListener("click", () => {
    bottomPanel.classList.toggle("minimized");
    panelToggle.classList.toggle("minimized");
  });
}

// Inicializar o editor quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  new ImageEditor();
  initializeTabs();
  initializePanelToggle();
});

// Atalhos de teclado expandidos
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "v":
        e.preventDefault();
        document.getElementById("pasteBtn").click();
        break;
      case "s":
        e.preventDefault();
        document.getElementById("downloadBtn").click();
        break;
      case "z":
        e.preventDefault();
        if (e.shiftKey) {
          document.getElementById("redoBtn").click();
        } else {
          document.getElementById("undoBtn").click();
        }
        break;
      case "y":
        e.preventDefault();
        document.getElementById("redoBtn").click();
        break;
      case "r":
        e.preventDefault();
        document.getElementById("rotateBtn").click();
        break;
    }
  }

  // Tecla ESC para sair do modo crop
  if (e.key === "Escape") {
    const cropBtn = document.getElementById("cropBtn");
    if (cropBtn.textContent.includes("Confirmar")) {
      cropBtn.click();
    }
  }
});

// Previne zoom no mobile durante gestos
document.addEventListener("gesturestart", function (e) {
  e.preventDefault();
});

document.addEventListener("gesturechange", function (e) {
  e.preventDefault();
});

document.addEventListener("gestureend", function (e) {
  e.preventDefault();
});
