# Controle de Figurinhas Panini Copa do Mundo 2026

Aplicação web local para controlar figurinhas que você tem, faltantes e repetidas. O frontend usa React + Vite, o backend usa Node.js + Express e todos os dados ficam em arquivos JSON locais.

## Requisitos

- Node.js 20 ou superior recomendado.
- Windows, macOS ou Linux.

## Como instalar

Na raiz do projeto, execute:

```bash
npm install
```

Esse comando instala as dependências do frontend, backend e do script que roda os dois juntos.

## Como rodar

Na raiz do projeto, execute:

```bash
npm run dev
```

Endereços padrão:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

O comando `npm run dev` inicia o backend e o frontend ao mesmo tempo.

## Onde ficam os dados

A pasta `data/` contém os dados locais:

- `data/cards.json`: checklist oficial das figurinhas.
- `data/collection.json`: sua coleção, com a quantidade de cada figurinha.

Se `collection.json` for apagado, o backend recria automaticamente o arquivo com todas as quantidades em `0` ao consultar ou salvar a coleção.

## Como usar

### Dashboard

A página inicial mostra:

- percentual completo;
- total geral;
- total que você tem;
- total faltante;
- total repetido;
- cards por país/seção com progresso individual.

### Controle das figurinhas

Clique em um país/seção para abrir todas as figurinhas daquele grupo.

- Clique esquerdo em uma figurinha: incrementa a quantidade.
- Botão `-`: decrementa a quantidade.
- Clique direito em uma figurinha: decrementa a quantidade.
- A quantidade nunca fica negativa.
- Toda alteração é salva automaticamente em `data/collection.json`.

Cores:

- Vermelho: faltando (`0`).
- Verde: tenho (`1`).
- Amarelo/laranja: repetida (`2` ou mais).

### Busca

A busca aceita:

- código: `RSA1`, `RSA 1`, `RSA01`, `RSA 01`;
- sigla: `RSA`, `BRA`, `FWC`;
- nome em português: `África do Sul`, `Brasil`;
- nome em inglês: `South Africa`, `Brazil`.

A busca ignora acentos, espaços e maiúsculas/minúsculas.

## Como importar TXT

Clique em **Importar TXT**. Você pode colar o texto ou selecionar um arquivo `.txt`.

Formatos aceitos:

```txt
RSA1, RSA2, RSA3, RSA4, RSA5
RSA6, RSA7, RSA9, RSA10, RSA11

KOR3, KOR4, KOR6, KOR7
```

ou:

```txt
FWC - 1, 1, 14, 14, 15
COL - 5, 18, 14, 9
ESP - 9, 3, 11
TUR - 18, 18, 19, 14
```

Regras:

- A aplicação detecta o formato automaticamente.
- `RSA1`, `RSA 1`, `RSA01` e `RSA 01` são equivalentes.
- Cartas inexistentes aparecem na lista de inválidas.
- Números repetidos somam quantidades repetidas.
- Nada é salvo até clicar em **Confirmar importação**.

Exemplo:

```txt
FWC - 1, 1
```

Resultado: `FWC1` fica com quantidade `2`.

## Como exportar TXT

Clique em **Exportar TXT** e escolha uma opção:

1. Todas que tenho.
2. Repetidas.
3. Faltantes.

O formato gerado é sempre agrupado por sigla e segue a ordem de `data/cards.json`:

```txt
FWC - 1, 1, 14, 14, 15
COL - 5, 18, 14, 9
ESP - 9, 3, 11
TUR - 18, 18, 19, 14
```

Você pode copiar o texto ou baixar um arquivo `.txt`.

## Como fazer backup

Para fazer backup, copie a pasta `data/` ou pelo menos o arquivo:

```txt
data/collection.json
```

Para restaurar, feche a aplicação, substitua `data/collection.json` pelo backup e rode novamente `npm run dev`.

## API do backend

Rotas disponíveis:

- `GET /cards`
- `GET /collection`
- `POST /collection`
- `POST /import`
- `POST /import/confirm`
- `GET /export/all`
- `GET /export/duplicates`
- `GET /export/missing`

## Testes e build

```bash
npm test
```

Esse comando roda os testes do backend e gera o build de produção do frontend.
