# WattControl — Plataforma de Gestão de Consumo de Energia Elétrica

Plataforma digital (website) que **estima o consumo de energia elétrica residencial**
e ajuda o usuário a **gerenciar seus gastos**. O usuário monta uma "casa virtual"
escolhendo eletrodomésticos e definindo o tempo de uso diário; a plataforma calcula
o consumo em kWh, o custo na conta de luz e compara o resultado com a média
das residências brasileiras.

> Projeto acadêmico de faculdade.

## Funcionalidades

- **Dashboard** com indicadores (KPIs): consumo mensal (kWh), custo mensal e anual (R$), comparação com a média nacional (%) e emissão estimada de CO₂.
- **Catálogo de dados** com os eletrodomésticos mais usados no Brasil e suas potências típicas em Watts.
- **Escolha de eletrodomésticos** com busca e filtro por categoria.
- **Ajuste do horário de uso diário** (horas/dia) e da **quantidade** de cada aparelho para calcular o gasto mensal com base no tempo de uso.
- **Gráfico de pizza (rosca)** — participação de cada categoria no consumo total.
- **Gráfico de barras** — ranking dos aparelhos que mais pesam na conta.
- **Gráfico de linhas** — projeção do consumo ao longo de 12 meses comparada à **média residencial brasileira**.
- **Tarifa editável** (R$/kWh) e dicas de economia.

## Metodologia de cálculo

**Consumo mensal de cada aparelho:**

```
Consumo (kWh) = Potência (W) × Horas por dia × 30 dias × Quantidade ÷ 1000
```

**Custo mensal:**

```
Custo (R$) = Consumo (kWh) × Tarifa (R$/kWh)
```

- **Tarifa padrão:** R$ 0,76/kWh (editável).
- **Média residencial brasileira:** 163 kWh/mês (referência ANEEL/PROCEL).
- **Geladeira e freezer:** usam *potência média efetiva*, pois o compressor liga e desliga em ciclos (não consome o tempo todo).
- **Gráfico de linhas (anual):** aplica fatores de sazonalidade, o ar-condicionado pesa mais no verão e o chuveiro elétrico no inverno.
- **Emissão de CO₂:** estimada com fator médio de 0,0817 kg CO₂/kWh do Sistema Interligado Nacional.

> Os valores de potência e tarifa são **médias de referência** (manuais de fabricantes, INMETRO/PROCEL e ANEEL) e servem para **estimativa educacional**.

## Como rodar

Basta abrir o arquivo **`index.html`** em qualquer navegador moderno (Chrome, Edge, Firefox).

> É necessário **conexão com a internet** na primeira abertura, pois a biblioteca de gráficos (Chart.js) e as fontes são carregadas via CDN.

Opcional — para rodar com um servidor local:

```bash
python -m http.server 8000
```

## Estrutura do projeto

```
wattcontrol/
├── css/
│   └── styles.css      # estilos e design da interface
├── js/
│   ├── app.js          # lógica: cálculos, tabela, KPIs e gráficos
│   └── database.js     # catálogo de dados: aparelhos, potências e parâmetros nacionais
├── .gitignore          # arquivos ignorados pelo Git
├── index.html          # página principal
├── LICENSE             # licença de uso (MIT)
└── README.md           # este arquivo
```

## Ferramentas

- HTML5, CSS3 e JavaScript
- [Chart.js](https://www.chartjs.org/) para os gráficos
- Google Fonts (Bricolage Grotesque + Plus Jakarta Sans)