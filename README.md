# PROMPT DE DESENVOLVIMENTO: APLICATIVO DE PLANEJAMENTO FINANCEIRO COM SPLIT E ETAPAS

## 1. VISÃO GERAL DO PROJETO
Desenvolva um aplicativo mobile em React Native (usando Expo) focado em planejamento financeiro local, controle de fluxo de caixa e split de pagamentos sequenciais por etapas de recebimento. O aplicativo prioriza a privacidade total do usuário, executando todas as operações e armazenamento de dados no próprio dispositivo com criptografia local.

---

## 2. STACK TECNOLÓGICA E ARQUITETURA
- **Framework:** React Native com Expo (Workflow Gerenciado).
- **Linguagem:** TypeScript.
- **Gerenciamento de Estado:** Zustand (pela simplicidade e alta performance).
- **Armazenamento Local e Criptografia:** `react-native-mmkv` para armazenamento de alta velocidade e `expo-secure-store` para guardar a chave de criptografia/PIN de 8 dígitos do usuário.
- **Autenticação Biométrica:** `expo-local-authentication`.
- **Notificações:** `expo-notifications` (agendamento local puro).
- **Estilização:** Tailwind CSS via NativeWind.

---

## 3. MÓDULOS E FLUXOS DE UX/UI

### A. Fluxo de Onboarding e Segurança
1. **Primeiro Acesso (Setup de Segurança):**
   - Criação de uma senha/PIN numérico obrigatoriamente de 8 dígitos.
   - Habilitação opcional de desbloqueio por Biometria/FaceID.
   - Solicitação de reautenticação SEMPRE que o app for aberto ou restaurado do segundo plano.
2. **Setup Financeiro Inicial:**
   - Formulário obrigatório no primeiro acesso para coletar:
     - Datas de recebimento do mês (ex: dias 15 e 30).
     - Salário/Renda total mensal.
     - Bancos/Contas utilizadas.
     - Dívidas atuais conhecidas.
   - *Nota:* Todas essas informações devem ser armazenadas localmente e ser 100% editáveis no futuro através da aba **Perfil/Configurações**.

---

### B. Módulo de Planejamento e Etapas (Regra de Negócio Principal)
1. **Estrutura de Dados:**
   - Um **Planejamento** contêiner pode conter múltiplas **Etapas/Metas**.
2. **Cadastro de Planejamento / Etapa:**
   - Título e Descrição detalhada.
   - Valor Total a ser pago.
   - Quem irá receber (Nome do Favorecido) e Chave PIX.
   - Recorrência: Sim/Não. Se Sim, informar o intervalo/período.
   - Data Limite/Quando pagar.
3. **Lógica Matemática e Split de Pagamentos (Sem uso de IA, regras determinísticas):**
   - O aplicativo deve calcular o valor mensal necessário dividindo o valor total pelos meses restantes até a data limite.
   - **Split Sequencial por Recebimento:** Permitir que o usuário configure a proporção de pagamento por data de recebimento cadastrada no perfil.
     - *Exemplo:* Se o usuário recebe nos dias 15 e 30, permitir configurar a regra (ex: 40% no dia 15 e 60% no dia 30).
     - O sistema deve atribuir automaticamente os valores exatos a cada data do calendário do planejamento.

---

### C. Notificações Locais e Triggers
- Agendar alertas locais (`expo-notifications`) com antecedência configurável (ex: 3 dias antes e no dia do pagamento) com base nas datas das etapas e recebimentos.
- Nenhuma informação deve sair do dispositivo para serviços externos de push.

---

### D. Módulo de Investimentos
- Criar a aba de **Investimentos** na navegação do app, porém mantê-la temporariamente como uma tela de placeholder no formato **"Em Breve / Em Construção"**, pronta para receber futuras integrações.

---

## 4. DIRETRIZES DE IMPLEMENTAÇÃO E EXECUÇÃO
1. Monte primeiro a estrutura de rotas com `expo-router` contendo a camada de segurança e onboarding.
2. Implemente o gerenciamento de estado com Zustand para manipular os planejamentos e perfil financeiro.
3. Crie os utilitários matemáticos de cálculo de parcelas e splits de datas de recebimento de forma isolada e testável.
4. Crie interfaces limpas, minimalistas e fáceis de navegar no uso diário.