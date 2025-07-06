class ImageEditor {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.originalImage = null;
    this.currentImage = null;
    this.isEditing = false;
    this.cropMode = false;
    this.cropData = null;
    this.filters = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
    };

    this.initializeEventListeners();
    this.setupDragAndDrop();
    this.setupPasteHandler();
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
    ];
    filterControls.forEach((filter) => {
      document.getElementById(filter).addEventListener("input", (e) => {
        this.filters[filter] = parseInt(e.target.value);
        this.applyFilters();
      });
    });

    // Filtros predefinidos
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.applyPresetFilter(e.target.dataset.filter);
        this.updateFilterButtons(e.target);
      });
    });

    // Canvas para crop
    this.canvas.addEventListener("mousedown", (e) => {
      if (this.cropMode) {
        this.startCrop(e);
      }
    });
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

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  loadImage(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido.");
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
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  displayImage() {
    if (!this.currentImage) return;

    const maxWidth = 800;
    const maxHeight = 600;

    let { width, height } = this.currentImage;

    // Redimensionar se necessário
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

    const { brightness, contrast, saturation, hue, blur } = this.filters;

    let filterString = "";
    if (brightness !== 100) filterString += `brightness(${brightness}%) `;
    if (contrast !== 100) filterString += `contrast(${contrast}%) `;
    if (saturation !== 100) filterString += `saturate(${saturation}%) `;
    if (hue !== 0) filterString += `hue-rotate(${hue}deg) `;
    if (blur > 0) filterString += `blur(${blur}px) `;

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
        break;
      case "cold":
        this.filters.hue = 200;
        this.filters.saturation = 120;
        break;
      case "warm":
        this.filters.hue = 20;
        this.filters.brightness = 110;
        break;
    }

    this.updateFilterSliders();
    this.applyFilters();
  }

  resetFilters() {
    this.filters = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
    };
  }

  updateFilterSliders() {
    Object.keys(this.filters).forEach((filter) => {
      document.getElementById(filter).value = this.filters[filter];
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
    };
    img.src = canvas.toDataURL();
  }

  toggleCropMode() {
    this.cropMode = !this.cropMode;
    const cropBtn = document.getElementById("cropBtn");

    if (this.cropMode) {
      cropBtn.textContent = "Confirmar Crop";
      cropBtn.style.background = "#28a745";
      this.canvas.style.cursor = "crosshair";
    } else {
      cropBtn.textContent = "Recortar";
      cropBtn.style.background = "";
      this.canvas.style.cursor = "default";
      this.applyCrop();
    }
  }

  startCrop(e) {
    // Implementação básica de crop - pode ser expandida
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Aqui você pode implementar a lógica de seleção de área para crop
    console.log("Crop iniciado em:", x, y);
  }

  applyCrop() {
    // Implementação do crop seria aqui
    console.log("Aplicando crop...");
  }

  resetImage() {
    if (!this.originalImage) return;

    this.currentImage = this.originalImage;
    this.resetFilters();
    this.updateFilterSliders();
    this.displayImage();

    // Resetar botões de filtro
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
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
      alert("Nenhuma imagem encontrada na área de transferência.");
    } catch (err) {
      console.error("Erro ao acessar área de transferência:", err);
      alert(
        "Não foi possível acessar a área de transferência. Use Ctrl+V ou arraste uma imagem."
      );
    }
  }

  downloadImage() {
    if (!this.canvas) return;

    const format = document.getElementById("formatSelect").value;
    const quality = document.getElementById("quality").value / 100;

    let mimeType = "image/png";
    let filename = "imagem_editada.png";

    switch (format) {
      case "jpeg":
        mimeType = "image/jpeg";
        filename = "imagem_editada.jpg";
        break;
      case "webp":
        mimeType = "image/webp";
        filename = "imagem_editada.webp";
        break;
    }

    const link = document.createElement("a");
    link.download = filename;
    link.href = this.canvas.toDataURL(mimeType, quality);
    link.click();
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
}

// Inicializar o editor quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  new ImageEditor();
});

// Atalhos de teclado
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
    }
  }
});
