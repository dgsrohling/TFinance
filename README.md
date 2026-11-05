<p align="center">
  <img src="assets/Logo_TFinance.png" alt="[T] Finance" width="480" />
</p>

# [T] Finance

Sistema web de gestão financeira pessoal para controlar **contas a pagar** e **contas a receber**, com dashboard, categorias, relatórios mensais e exportação em CSV. Todos os dados ficam armazenados localmente em um arquivo SQLite — sem login, sem nuvem e sem serviços externos.

## Funcionalidades

- **Dashboard**
  - Saldo atual (efetivo) e saldo previsto.
  - Totais de contas a pagar e a receber pendentes.
  - Valores vencidos e contas dos próximos 7 dias.
  - Gráfico de receitas x despesas dos últimos 6 meses.
  - Lista dos próximos vencimentos.
- **Contas a pagar**
  - Cadastro, edição e exclusão de despesas.
  - Descrição, categoria, valor, vencimento e observações.
  - Marcação como paga com data e valor efetivo (que pode diferir do previsto).
  - Filtros por texto, categoria, situação e período.
  - Lançamentos recorrentes mensais (gera N parcelas mensais de uma vez).
- **Contas a receber**
  - As mesmas operações das contas a pagar, com marcação de recebimento.
- **Categorias**
  - Categorias separadas para receitas e despesas.
  - Categorias em uso não podem ser excluídas e têm o tipo bloqueado para edição.
- **Relatórios**
  - Resumo mensal de receitas e despesas.
  - Histórico de lançamentos com filtros por período, tipo e categoria.
  - Totais previstos e efetivos (pagos/recebidos).
  - Exportação em CSV compatível com Excel (separador `;`, UTF-8 com BOM).
- **Interface**
  - Layout responsivo com menu lateral.
  - Tema claro e escuro (preferência salva no navegador).
  - Valores em reais (R$) e datas no padrão brasileiro (DD/MM/AAAA).

## Tecnologias

| Camada        | Tecnologia                          |
| ------------- | ----------------------------------- |
| Backend       | Node.js + Express                   |
| Banco de dados| SQLite (better-sqlite3)             |
| Frontend      | React + Vite                        |
| Estilos       | Tailwind CSS                        |
| Ícones        | Lucide React                        |
| Gráficos      | Recharts                            |

## Pré-requisitos

- **Node.js 20 ou superior** (testado com Node 24) e npm.
- Nenhum banco de dados externo ou serviço em nuvem é necessário.

## Instalação

Na pasta do projeto, execute:

```bash
npm install
```

O banco de dados é criado automaticamente na primeira execução, em `data/tfinance.db`, já com algumas categorias padrão (Salário, Moradia, Alimentação etc.). Nenhum lançamento fictício é inserido.

## Execução em desenvolvimento

```bash
npm run dev
```

Esse comando inicia:

- **API (Express):** http://localhost:3000
- **Frontend (Vite):** http://localhost:5173

Acesse **http://localhost:5173**. O Vite encaminha as chamadas `/api` para o backend automaticamente.

## Execução em produção

Gere o build do frontend e inicie o servidor:

```bash
npm run build
npm start
```

Acesse **http://localhost:3000**. Nesse modo, o Node.js serve tanto a API quanto os arquivos do frontend a partir da pasta `dist/`.

> `npm start` exige que o build tenha sido gerado antes (`npm run build`). Se `dist/` não existir, apenas a API será servida.

## Scripts disponíveis

| Comando            | Descrição                                                        |
| ------------------ | ---------------------------------------------------------------- |
| `npm install`      | Instala todas as dependências.                                   |
| `npm run dev`      | Sobe API + frontend em modo desenvolvimento (hot reload).        |
| `npm run dev:server` | Sobe apenas a API com nodemon.                                 |
| `npm run dev:client` | Sobe apenas o frontend com Vite.                               |
| `npm run build`    | Gera o build de produção do frontend em `dist/`.                 |
| `npm start`        | Executa em produção servindo API + frontend (`dist/`).           |
| `npm run preview`  | Pré-visualiza o build do Vite.                                   |

## Configuração

As variáveis de ambiente são opcionais:

| Variável   | Padrão              | Descrição                                                                 |
| ---------- | ------------------- | ------------------------------------------------------------------------- |
| `PORT`     | `3000`              | Porta do servidor Node.js.                                                |
| `HOST`     | `127.0.0.1`         | Endereço de escuta. Use `0.0.0.0` para permitir acesso na rede local.     |
| `DATA_DIR` | `./data`            | Pasta onde o banco `tfinance.db` é criado.                                |
| `DB_PATH`  | `./data/tfinance.db`| Caminho completo do arquivo SQLite. Tem prioridade sobre `DATA_DIR`.      |

Exemplos:

```powershell
# Windows PowerShell
$env:PORT = "4000"
$env:DB_PATH = "D:\Backups\tfinance.db"
npm start
```

```bash
# Linux/macOS
PORT=4000 DB_PATH=/home/usuario/tfinance.db npm start
```

> Como o sistema não possui autenticação, o padrão `127.0.0.1` restringe o acesso à própria máquina. Defina `HOST=0.0.0.0` apenas se quiser acessar de outros dispositivos da sua rede confiável.

## Banco de dados

- Arquivo principal: `data/tfinance.db`.
- Criado automaticamente na primeira execução, junto com as tabelas:
  - `categories` — categorias de receita/despesa.
  - `payables` — contas a pagar.
  - `receivables` — contas a receber.
- Valores monetários são armazenados em **centavos** (inteiros) para evitar erros de precisão.
- Datas são armazenadas no formato ISO (`AAAA-MM-DD`) e exibidas como `DD/MM/AAAA`.
- O SQLite usa o modo WAL, então podem existir também os arquivos `tfinance.db-wal` e `tfinance.db-shm`.

### Backup

O backup é simples: **pare a aplicação** (para o SQLite consolidar o WAL) e copie o arquivo do banco ou a pasta `data/` inteira.

```powershell
# Windows PowerShell - com a aplicação parada
Copy-Item -Recurse data "backup-tfinance-$(Get-Date -Format yyyy-MM-dd)"
```

```bash
# Linux/macOS - com a aplicação parada
cp -r data "backup-tfinance-$(date +%F)"
```

### Restauração

1. Pare a aplicação.
2. Substitua o arquivo `data/tfinance.db` (e, se existirem, os arquivos `-wal`/`-shm`) pelo backup.
3. Inicie a aplicação novamente.

### Reiniciar os dados

Para começar do zero, pare a aplicação, apague a pasta `data/` (ou apenas `data/tfinance.db*`) e inicie novamente. As tabelas e as categorias padrão serão recriadas.

## Como usar

1. **Categorias** — revise ou crie categorias de receitas e despesas.
2. **Contas a pagar / receber** — cadastre os lançamentos. Marque a opção *Repetir mensalmente* para gerar várias parcelas de uma vez.
3. **Baixa de contas** — use o ícone de check para registrar pagamento/recebimento com data e valor efetivo. É possível desfazer a baixa.
4. **Dashboard** — acompanhe saldos, vencidos e próximos vencimentos.
5. **Relatórios** — filtre por período, tipo e categoria e clique em **Exportar CSV**.

## API (resumo)

| Método | Rota                              | Descrição                                    |
| ------ | --------------------------------- | -------------------------------------------- |
| GET    | `/api/health`                     | Verificação de saúde e caminho do banco.     |
| GET    | `/api/categories?type=`           | Lista categorias (`income` ou `expense`).    |
| POST   | `/api/categories`                 | Cria categoria.                              |
| PUT    | `/api/categories/:id`             | Atualiza categoria.                          |
| DELETE | `/api/categories/:id`             | Exclui categoria não utilizada.              |
| GET    | `/api/payables`                   | Lista contas a pagar com filtros.            |
| POST   | `/api/payables`                   | Cria conta a pagar (aceita `occurrences`).   |
| PUT    | `/api/payables/:id`               | Atualiza conta a pagar.                      |
| DELETE | `/api/payables/:id`               | Exclui conta a pagar.                        |
| PATCH  | `/api/payables/:id/settle`        | Registra pagamento.                          |
| PATCH  | `/api/payables/:id/revert`        | Desfaz pagamento.                            |
| GET    | `/api/receivables`                | Lista contas a receber com filtros.          |
| POST   | `/api/receivables`                | Cria conta a receber (aceita `occurrences`). |
| PUT    | `/api/receivables/:id`            | Atualiza conta a receber.                    |
| DELETE | `/api/receivables/:id`            | Exclui conta a receber.                      |
| PATCH  | `/api/receivables/:id/settle`     | Registra recebimento.                        |
| PATCH  | `/api/receivables/:id/revert`     | Desfaz recebimento.                          |
| GET    | `/api/dashboard`                  | Dados agregados do dashboard.                |
| GET    | `/api/reports?from=&to=&type=&categoryId=` | Relatório consolidado.             |
| GET    | `/api/reports/export?...`         | Exporta o relatório em CSV.                  |

Filtros de listagem: `q`, `status` (`all`, `pending`, `overdue`, `settled`), `categoryId`, `from` e `to`.

## Estrutura do projeto

```text
TFinance/
├── data/                  # Banco SQLite (criado em tempo de execução)
├── dist/                  # Build de produção do frontend
├── public/                # Arquivos estáticos (favicon)
├── server/
│   ├── index.js           # Servidor Express (API + estáticos)
│   ├── db.js              # Conexão, schema e seed de categorias
│   ├── lib/               # Validação e serialização
│   └── routes/            # Rotas: categorias, contas, dashboard, relatórios
├── src/
│   ├── api.js             # Cliente HTTP da API
│   ├── components/        # Layout, modais, gráficos, formulários...
│   ├── contexts/          # Tema e toasts
│   ├── lib/               # Formatação de valores/datas e estilos
│   └── pages/             # Dashboard, contas, categorias, relatórios
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Solução de problemas

- **Porta 3000 em uso** — altere com `PORT=4000 npm start`. Em desenvolvimento, o Vite usa `5173` e encaminha `/api` para `http://localhost:3000`; se mudar a porta da API, ajuste o `proxy` em `vite.config.js`.
- **`npm start` sem interface** — gere o build com `npm run build` antes.
- **Erro ao carregar `better-sqlite3`** — execute `npm rebuild better-sqlite3`. Em versões novas do npm que bloqueiam scripts de instalação, aprove os scripts (`npm install-scripts approve better-sqlite3`) e rode `npm rebuild`.
- **Banco corrompido ou dados indesejados** — pare a aplicação, remova `data/tfinance.db*` e inicie novamente (isso apaga os lançamentos).
- **Node.js antigo** — utilize Node.js 20 ou superior.
- **Acesso em outro dispositivo** — defina `HOST=0.0.0.0` e libere a porta no firewall. Lembre-se de que o sistema não possui autenticação.

## Observações

- O sistema é de uso pessoal e **não possui login**.
- Nenhum dado sai da sua máquina: tudo fica no arquivo SQLite local.
- Os valores do dashboard e dos relatórios distinguem **previsto** (vencimento/valor cadastrado) de **efetivo** (data e valor efetivamente pagos/recebidos).

---

Desenvolvido por D. Rohling.
