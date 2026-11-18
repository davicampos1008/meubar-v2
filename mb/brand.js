// ============ MARCA (logo e nome) ============
// Para trocar a logo: substitua o arquivo logo.svg por outro com o MESMO NOME
// (ou escreva abaixo o nome do novo arquivo, ex: 'logo.png'). Muda em todo o app.
// Para esconder o nome ao lado da logo, use showName:false.
const BRAND={name:'Meu Bar',logo:'logo.png',showName:true};
const logoImg=(c='')=>`<img class="logo ${c}" src="${BRAND.logo}" alt="${BRAND.name}">`;
const brandMark=(c='')=>`<span class="brand ${c}">${logoImg(c)}${BRAND.showName?`<span class="bn">${BRAND.name}</span>`:''}</span>`;
(()=>{const l=document.createElement('link');l.rel='icon';l.href=BRAND.logo;document.head.appendChild(l)})();