// ============ MARCA (logo e nome) ============
// Troque o arquivo logo.png ou altere o caminho abaixo.
const BRAND = { name: "Meu Bar", logo: "logo.png", showName: true };
const logoImg = (c = "") =>
  `<img class="logo ${c}" src="${BRAND.logo}" alt="${BRAND.name}" onerror="this.style.display='none'">`;
const brandMark = (c = "") =>
  `<span class="brand ${c}">${logoImg(c)}${BRAND.showName ? `<span class="bn">${BRAND.name}</span>` : ""}</span>`;
(() => {
  const l = document.createElement("link");
  l.rel = "icon";
  l.href = BRAND.logo;
  document.head.appendChild(l);
})();
