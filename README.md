# Nexo Executivo — Portal de Indicadores

Aplicação inicial para reunir várias planilhas privadas do Google Sheets num portal executivo, com dashboard responsivo, gráficos, pesquisa, exportação CSV e uma camada básica de proteção por senha.

> **Importante:** a tela inicial usa dados fictícios de demonstração. Os números não representam resultados reais. A conexão real depende da configuração das planilhas e do mapeamento dos indicadores da empresa.

## Stack

- Next.js App Router + React + TypeScript
- Recharts para visualização de dados
- Google Sheets API com conta de serviço somente leitura
- GitHub para versionamento e Vercel para hospedagem
- Acesso por senha compartilhada e cookie HTTP-only assinado (MVP)

## 1. Executar localmente

Requisitos: Node.js 20.9 ou superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Acesse http://localhost:3000. Sem fontes configuradas, o portal permanece em modo de demonstração.

## 2. Preparar o Google Sheets

1. Abra o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie ou selecione um projeto e habilite **Google Sheets API**.
3. Crie uma conta de serviço e gere uma chave JSON.
4. Copie o e-mail da conta de serviço para `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
5. Copie o conteúdo de `private_key` para `GOOGLE_PRIVATE_KEY`. Em `.env.local`, preserve os saltos de linha ou use `\n`.
6. Em cada Google Sheets, clique em Compartilhar e adicione o e-mail da conta de serviço como **Leitor**. Não torne as planilhas públicas.
7. Configure `SHEETS_SOURCES_JSON`, com uma entrada por planilha. O intervalo deve incluir a primeira linha com os nomes das colunas.

Exemplo:

```env
SHEETS_SOURCES_JSON='[
  {"name":"Operacional","spreadsheetId":"ID_DA_PLANILHA_1","range":"Dados!A:Z"},
  {"name":"Segurança","spreadsheetId":"ID_DA_PLANILHA_2","range":"\u0027Indicadores mensais\u0027!A:Z"}
]'
```

O `spreadsheetId` é o trecho entre `/d/` e `/edit` no endereço do Google Sheets. Para abas com espaços, use aspas simples em torno do nome da aba no intervalo.

## 3. Proteger os dados reais

Configure também estas variáveis:

```env
DASHBOARD_PASSWORD="uma-senha-forte-e-unica"
DASHBOARD_SESSION_SECRET="um-segredo-aleatorio-com-pelo-menos-32-caracteres"
```

A rota de dados **não disponibiliza as planilhas reais** quando a proteção por senha e o segredo da sessão não estão configurados. A senha compartilhada é adequada para o MVP interno; para uma implantação corporativa mais ampla, recomenda-se SSO ou autenticação gerenciada e permissões por função.

Nunca:
- faça commit de `.env.local`;
- coloque credenciais de conta de serviço em variáveis `NEXT_PUBLIC_*`;
- publique planilhas que contenham dados pessoais ou empresariais sensíveis;
- use os dados ilustrativos para reportar resultados da empresa.

## 4. Publicar usando GitHub + Vercel

1. Crie um repositório **privado** no GitHub e envie estes arquivos.
2. Importe o repositório em [Vercel](https://vercel.com/).
3. Em **Project → Settings → Environment Variables**, configure as variáveis de ambiente acima para Preview e Production, conforme necessário.
4. Publique e teste o acesso com a senha; confira cada fonte, o intervalo e a atualização.
5. Após qualquer alteração nas variáveis da Vercel, faça um novo deployment para aplicar os valores.

## 5. Limites desta primeira versão

- A API consulta até 1.000 linhas por fonte para compor a amostra visível, mas informa o total de linhas retornadas pela API.
- A atualização é manual pelo botão **Atualizar**; cache e agendamento podem ser adicionados depois.
- O portal exibe o conteúdo das fontes em formato genérico. KPIs corporativos confiáveis dependem de conhecer as colunas, regras, metas e fórmulas reais.
- Os módulos Operacional, Segurança, Financeiro e Pessoas são pontos iniciais de navegação, ainda não mapeamentos definitivos.
- O acesso por senha é compartilhado; não oferece identidades individuais nem auditoria de usuários.

## Próximo passo recomendado

Envie uma cópia anonimizada de cada planilha ou uma amostra com nomes das abas, colunas e algumas linhas. Com isso, ajuste-se a consolidação, determine-se a semântica de cada indicador e substituam-se os gráficos ilustrativos por indicadores da operação real.
