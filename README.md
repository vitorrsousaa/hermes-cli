# Hermes CLI

CLI para automatizar o fluxo de desenvolvimento entre Linear, GitHub e Slack, eliminando o overhead administrativo manual (~15-20min por ticket) ao transicionar entre etapas.

## Instalação

```bash
npm install -g @care-webs/hermes
```

Ou via `npm link` para desenvolvimento:

```bash
npm run build && npm link
```

## Pré-requisitos

- **GitHub CLI** (`gh`): [https://cli.github.com/](https://cli.github.com/)
- **Linear CLI** (`@schpet/linear-cli`): `npm install -g @schpet/linear-cli && linear auth`
- **Slack CLI** (opcional, para `hermes review`): [https://api.slack.com/automation/cli](https://api.slack.com/automation/cli)

## Setup

Execute a configuração inicial:

```bash
hermes config
```

O wizard irá solicitar apenas:

- Linear API key
- Linear team ID

Os demais valores (status, canal Slack, etc.) usam defaults. Customização será implementada futuramente.

A configuração é salva em `~/.hermes/config.json`.

## Workflow completo

### 1. Iniciar trabalho em um ticket

```bash
hermes start <ticket-id>
```

- Busca o ticket no Linear
- Move para "In Progress"
- Cria branch `feat/<id>` ou `fix/<id>` (use `--type fix` para fix)
- Salva contexto em `.hermes-context.json`

### 2. Disparar ambiente efêmero e atualizar ticket

```bash
hermes test
```

- Dispara o workflow de deploy no GitHub Actions
- Gera informações de teste com Claude Code
- Atualiza a descrição do ticket no Linear
- Move para "DEV Testing"
- Aguarda conclusão do deploy (polling com backoff exponencial)
- Extrai URL do ambiente efêmero dos logs

### 3. Criar pull request

```bash
hermes pr
```

- Cria PR com título `[TICKET-ID] Título` e template pré-preenchido
- Copia URL para clipboard
- Salva `prUrl` e `prNumber` no contexto

### 4. Solicitar revisão

```bash
hermes review
```

- Envia mensagem no Slack com link do PR e preview
- Move ticket para "Ready for QA"

### 5. Encerrar ambiente efêmero

```bash
hermes stop
```

- Dispara workflow de destroy
- Remove `ephemeralEnvUrl` do contexto

## Referência de configuração

```json
{
  "linear": {
    "apiKey": "...",
    "teamId": "...",
    "statusInProgress": "In Progress",
    "statusDevTesting": "DEV Testing",
    "statusInReview": "Ready for QA"
  },
  "github": {
    "deployWorkflow": "deploy-ephemeral.yml",
    "destroyWorkflow": "destroy-ephemeral.yml"
  },
  "slack": {
    "channel": "#review"
  },
  "claudeCode": {
    "command": "claude run test-info"
  }
}
```

## Desenvolvimento

```bash
npm install
npm run build
npm run dev   # watch mode
```

## Debug

Para ver stack traces em erros inesperados:

```bash
HERMES_DEBUG=1 hermes <comando>
```
