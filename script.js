const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const emptyState = document.getElementById('emptyState');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const controls = {
  brightness: document.getElementById('brightness'),
  contrast: document.getElementById('contrast'),
  saturation: document.getElementById('saturation')
};
const values = {
  brightness: document.getElementById('brightnessValue'),
  contrast: document.getElementById('contrastValue'),
  saturation: document.getElementById('saturationValue')
};

let image = null;

function render() {
  if (!image) return;
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  ctx.filter = `brightness(${controls.brightness.value}%) contrast(${controls.contrast.value}%) saturate(${controls.saturation.value}%)`;
  ctx.drawImage(image, 0, 0);
  ctx.filter = 'none';
  Object.keys(controls).forEach(key => values[key].textContent = `${controls[key].value}%`);
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  image = new Image();
  image.onload = () => {
    emptyState.style.display = 'none';
    canvas.style.display = 'block';
    downloadBtn.disabled = false;
    render();
    URL.revokeObjectURL(url);
  };
  image.src = url;
});

Object.values(controls).forEach(input => input.addEventListener('input', render));

resetBtn.addEventListener('click', () => {
  controls.brightness.value = 100;
  controls.contrast.value = 100;
  controls.saturation.value = 100;
  render();
});

downloadBtn.addEventListener('click', () => {
  if (!image) return;
  const link = document.createElement('a');
  link.download = 'my-edited-photo.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
