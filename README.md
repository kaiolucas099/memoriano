# Memoriano ❤️🖤

Jogo da memória rubro-negro feito com **React 18 + Vite 5**.

## Requisitos

- Node.js 18 ou superior
- npm

## Executar localmente

```bash
git clone https://github.com/kaiolucas099/memoriano.git
cd memoriano
npm install
npm run dev
```

O Vite exibirá o endereço local (normalmente http://localhost:5173).

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento Vite |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Executa uma prévia local da versão de produção |

## Publicar no Cloudflare Pages

Conecte este repositório ao Cloudflare Pages e use:

| Configuração | Valor |
| --- | --- |
| Production branch | `main` |
| Framework preset | `Vite` (ou `None`, configurando os campos abaixo) |
| Root directory | `/` (raiz do repositório) |
| Build command | `npm run build` |
| Build output directory | `dist` |

Não é necessário configurar servidor ou função: o jogo é uma aplicação React estática. O Cloudflare Pages instala as dependências, executa o build e publica o conteúdo de `dist/`. Novos commits na branch `main` disparam novas publicações se a integração Git estiver habilitada.

## Estrutura

- `src/App.jsx`: interface e lógica do jogo
- `src/data.js`: dados dos jogadores e imagens
- `src/main.jsx`: inicialização do React
- `src/styles.css`: estilos
- `public/assets/`: arquivos estáticos, incluindo o escudo
- `vite.config.js`: configuração do Vite
