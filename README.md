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

---

## 5. ETAPAS PENDENTES / PRÓXIMAS ATUALIZAÇÕES

### A. Planejamento, Dívidas e Etapas
1. **Configuração de Dívidas no Planejamento:** Permitir realizar a configuração de dívidas e inseri-las diretamente no fluxo de planejamento financeiro.
2. **Edição Flexível no Planejamento:** Permitir alterar a maioria das informações/propriedades já cadastradas na etapa de planejamento.
3. **Opções Personalizadas de Split e Pagamento:**
   - Configurar como o item será pago (se haverá divisão/split ou não).
   - Definir a porcentagem exata (% split) para cada fração do pagamento.
4. **Modelo de Etapas Opcional:** Tornar a utilização do modelo por etapas algo opcional durante a criação/edição do planejamento.
5. **Meio / Conta de Pagamento:** Adicionar campo no planejamento para selecionar a conta/método de pagamento (ex: Cartão de Crédito, PIX, Débito, Boleto, etc.).

### B. Ajustes de UI/UX e Navegação
1. **Aba de Navegação Adaptável (Android SafeArea):** Ajustar a barra de navegação inferior (bottom navigation) para que seja responsiva e se adapte corretamente ao dispositivo, evitando sobreposição com a barra de navegação/gestos nativa do Android.
2. **Seleção de Data via Calendário:** Substituir a digitação manual de datas por um componente visual de calendário (DatePicker/Calendar).
3. **Ajustes na Tela Home:**
   - **Remoção de Ação Direta:** Remover a funcionalidade/botão de "Marcar como Pago" direto do card na Home.
   - **Detalhes / Mais Informações:** Manter o botão "Marcar como Pago" exclusivamente na tela/modal de "Mais Informações" do item.
   - **Copiar Chave PIX:** Na tela/modal de "Mais Informações", adicionar a funcionalidade de copiar a chave PIX (quando cadastrada).
4. **Gráfico de Rosca de Gastos Comprometidos:** Adicionar na Home um gráfico de rosca representando o percentual e valor dos gastos comprometidos do mês.

### C. Regras de Negócio e Filtros
1. **Cálculo de Fluxo Apenas Mensal:** Alterar o modo de fluxo para realizar cálculos exclusivamente mensais, considerando somente as movimentações e alterações referentes ao mês ativo.
2. **Filtro de Próximos Pagamentos:** Exibir na lista de próximos pagamentos apenas os itens correspondentes ao mês referente atual ou conforme o filtro ativo selecionado pelo usuário.

---

## 6. A FAZERES (LISTA DE TAREFAS POR ETAPAS)

> Esta seção organiza todo o escopo pendente e refinamentos em etapas sequenciais de execução.

### 📍 Etapa 1: Gestão e Configuração de Dívidas
- [x] Formulário completo para cadastrar/editar dívidas no Perfil (valor total, parcelas, valor mensal, vencimento, conta/forma de pagamento).
- [x] Adicionar flag `isIncludedInMonthlyPlanning` para integrar dívidas diretamente no cálculo de gastos comprometidos e no planejamento mensal.

### 📍 Etapa 2: Flexibilidade no Planejamento e Etapas Opcionais
- [x] Permitir a edição completa de planejamentos e etapas existentes (valores, datas, favorecido, PIX, conta, split).
- [x] Tornar o modelo de etapas 100% opcional (suporte total a planejamentos diretos e planejamentos no formato container com etapas).
- [x] Adicionar seleção da conta de origem e meio de pagamento (Crédito, Débito, PIX, Boleto, Dinheiro, etc.) em cada planejamento ou etapa.

### 📍 Etapa 3: Regras de Pagamento e Split Personalizado
- [x] Permitir selecionar a modalidade de pagamento do planejamento (`single` para pagamento único ou `split` para parcelamento sequencial).
- [x] Configurar e aplicar porcentagens de split customizadas por data de recebimento do usuário (% por dia de salário).

### 📍 Etapa 4: Reformulação da Tela Home, Gráficos e Ações
- [x] Exibir gráfico de rosca interativo na Home para visualizar os gastos comprometidos do mês em relação ao orçamento total.
- [x] Remover a ação/botão de "Marcar como Pago" direto dos cards da Home.
- [x] Manter "Marcar como Pago" exclusivamente acessível na modal/tela de "Mais Informações" do item.
- [x] Implementar a opção de "Copiar Chave PIX" (com acionamento de feedback visual/toast) no modal de "Mais Informações".

### 📍 Etapa 5: Cálculo de Fluxo Mensal e Filtros de Vencimentos
- [x] Ajustar o cálculo do fluxo financeiro para considerar estritamente o mês ativo/selecionado pelo usuário.
- [x] Exibir na lista de próximos pagamentos apenas as contas/parcelas referentes ao mês atual ou de acordo com o filtro de mês ativo.

### 📍 Etapa 6: Calendário e Responsividade da Navegação
- [x] Substituir campos de entrada de texto manual de datas por um seletor visual com componente de Calendário (`DatePickerButton`).
- [x] Ajustar o layout da aba de navegação inferior (`TabLayout`) usando `SafeArea` para garantir excelente responsividade em qualquer dispositivo Android/iOS.
