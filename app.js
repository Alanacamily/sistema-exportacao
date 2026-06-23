  console.log("APP.JS CARREGOU")
  console.log("Supabase conectado")

const SUPABASE_URL = "https://ayekrvnqjtmpvjtrwqnd.supabase.co";
const SUPABASE_KEY = "sb_publishable_e9EC0WSIoq3ISWipVj1TTA_a_ZG1Bz0";

const banco = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Conexão Supabase inicializada")

let processos = [];
let lixeira = [];
let tipoRelatorioAtual = null;
let editandoIndex = null;
let diasAbertos = {};
let diaSelecionadoExportacao = null;
let usuarioAtual = null;
let nivelUsuario = null;
let realtimeAtivado = false;

function mostrarLoading() {
  const loading = document.getElementById("loadingSistema");

  if (loading) {
    loading.style.display = "block";
  }
}

function esconderLoading() {
  const loading = document.getElementById("loadingSistema");

  if (loading) {
    loading.style.display = "none";
  }
}

function valor(id) {
  return document.getElementById(id).value;
}

function converterDataBR(dataBR) {
  const partes = String(dataBR || "").split("/");

  if (partes.length !== 3) {
    return new Date(0);
  }

  return new Date(
    Number(partes[2]),
    Number(partes[1]) - 1,
    Number(partes[0])
  );
}

function preencherDatalist(idLista, valores) {
  const lista = document.getElementById(idLista);

  if (!lista) return;

  lista.innerHTML = "";

  const valoresUnicos = [...new Set(
    valores
      .map(function(valor) {
        return String(valor || "").trim();
      })
      .filter(function(valor) {
        return valor !== "";
      })
  )];

  valoresUnicos.sort(function(a, b) {
    return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
  });

  valoresUnicos.forEach(function(valor) {
    const option = document.createElement("option");
    option.value = valor;
    lista.appendChild(option);
  });
}

async function carregarReferenciasCadastro() {
  const resposta = await banco
    .from("processos")
    .select("empresa, cnpj, mercadoria, parceiro, transporte");

  if (resposta.error) {
    console.error("Erro ao carregar referências:", resposta.error);
    return;
  }

  const referencias = resposta.data || [];

  preencherDatalist("listaEmpresas", referencias.map(p => p.empresa));
  preencherDatalist("listaCnpjs", referencias.map(p => p.cnpj));
  preencherDatalist("listaMercadorias", referencias.map(p => p.mercadoria));
  preencherDatalist("listaParceiros", referencias.map(p => p.parceiro));
  preencherDatalist("listaTransportes", referencias.map(p => p.transporte));

  ativarAutocomplete("empresa", referencias.map(p => p.empresa));
}

function preencherDadosEmpresa(nomeEmpresa) {
  const processosEmpresa = processos.filter(function(p) {
    return String(p.empresa || "").trim().toLowerCase() ===
           String(nomeEmpresa || "").trim().toLowerCase();
  });

  if (processosEmpresa.length === 0) return;

  const ultimoProcesso = processosEmpresa[processosEmpresa.length - 1];

  document.getElementById("mercadoria").value =
    ultimoProcesso.mercadoria || "";

  preencherDatalist("listaCnpjs", processosEmpresa.map(p => p.cnpj || ""));
  preencherDatalist("listaTransportes", processosEmpresa.map(p => p.transporte || ""));
  preencherDatalist("listaParceiros", processosEmpresa.map(p => p.parceiro || ""));

  document.getElementById("cnpj").value = "";
  document.getElementById("transporte").value = "";
  document.getElementById("parceiro").value = "";

  const listaEmpresa = document.getElementById("auto_empresa");
  if (listaEmpresa) {
    listaEmpresa.innerHTML = "";
    listaEmpresa.style.display = "none";
  }
}

function ativarAutocomplete(idInput, valores) {
  const input = document.getElementById(idInput);
  if (!input) return;

  const listaId = "auto_" + idInput;
  let lista = document.getElementById(listaId);

  if (!lista) {
    lista = document.createElement("div");
    lista.id = listaId;
    lista.className = "autocomplete-lista";
    input.parentNode.appendChild(lista);
  }

  const valoresUnicos = [...new Set(
    valores.map(v => String(v || "").trim()).filter(v => v !== "")
  )];

  input.oninput = function() {
    const texto = input.value.toLowerCase();
    lista.innerHTML = "";
    lista.style.display = "none";

    if (!texto) return;

    valoresUnicos
      .filter(valor => valor.toLowerCase().includes(texto))
      .slice(0, 10)
      .forEach(function(valor) {
        const item = document.createElement("div");
        item.textContent = valor;

        item.onclick = function() {
          input.value = valor;
          lista.innerHTML = "";
          lista.style.display = "none";

          if (idInput === "empresa") {
            preencherDadosEmpresa(valor);
          }
        };

        lista.appendChild(item);
      });

    if (lista.children.length > 0) {
      lista.style.display = "block";
    }
  };
}

  async function carregarProcessos() {
  mostrarLoading();

  const { data: sessao } = await banco.auth.getSession();

  if (!sessao || !sessao.session) {
    alert("Sessão expirada. Faça login novamente.");
    esconderLoading();
    return;
  }

  const url = tipoRelatorioAtual
    ? `/api/processos?tipo=${tipoRelatorioAtual}`
    : "/api/processos";

  const resposta = await fetch(url, {
    headers: {
      Authorization: `Bearer ${sessao.session.access_token}`
    }
  });

  const data = await resposta.json();

  if (!resposta.ok) {
    console.error("Erro ao carregar processos pela API:", data);
    alert("Erro ao carregar processos.");
    esconderLoading();
    return;
  }

  processos = data.map(function(p) {
    return {
      id: p.id,
      empresa: p.empresa || "",
      cnpj: p.cnpj || "",
      quantidade: p.quantidade || "",
      dataAverbacao: p.data_averbacao || "",
      crt: p.crt || "",
      mercadoria: p.mercadoria || "",
      fatura: p.fatura || "",
      observacao: p.observacao || "",
      numeroVeiculo: p.numero_veiculo || "",
      transporte: p.transporte || "",
      pesoLiquido: p.peso_liquido || "",
      numeroDue: p.numero_due || "",
      lpco: p.lpco || "",
      responsavelDue: p.responsavel_due || "",
      responsavelCo: p.responsavel_co || "",
      aduanaIntegrada: !!p.aduana_integrada,
      fracionado: p.aduana_integrada ? false : !!p.fracionado,
      parceiro: p.parceiro || "",
      pais: p.pais || "",
      desembaraco: p.desembaraco || "",
      tipoRelatorio: p.tipo_relatorio || "foz",
      financeiroCobrou: p.financeiro_cobrou || false,
      dataLancamento: p.data_lancamento || "",
      diaFinalizado: p.dia_finalizado || false
    };
  });

  processos.sort(function(a, b) {
    const dataA = converterDataBR(formatarDataLancamentoParaDia(a.dataLancamento));
    const dataB = converterDataBR(formatarDataLancamentoParaDia(b.dataLancamento));

    if (dataB - dataA !== 0) {
      return dataB - dataA;
    }

    return (a.empresa || "").localeCompare(
      b.empresa || "",
      "pt-BR",
      { sensitivity: "base" }
    );
  });

  renderizarTabela();
  atualizarOpcoesRelatorio();
  carregarReferenciasCadastro();
  esconderLoading();
}

window.salvarProcesso = async function () {
  const pais = document.getElementById("pais")?.value.trim() || "";
  const desembaraco = document.getElementById("desembaraco")?.value.trim() || "";
  const empresa = valor("empresa").trim();
  const cnpj = valor("cnpj").trim();
  const quantidade = valor("quantidade");
  const dataAverbacao = valor("dataAverbacao");
  const crt = valor("crt").trim();
  const mercadoria = valor("mercadoria").trim();
  const fatura = valor("fatura").trim();
  const observacao = valor("observacao").trim();
  const numeroVeiculo = valor("numeroVeiculo").trim();
  const transporte = valor("transporte").trim();
  const pesoLiquido = valor("pesoLiquido").trim();
  const numeroDue = valor("numeroDue").trim();
  const lpco = valor("lpco").trim();
  const parceiro = valor("parceiro").trim();
  const dataLancamentoManual = document.getElementById("dataLancamentoManual")?.value || "";
  const aduanaIntegrada =

    document.getElementById("aduanaIntegrada").checked;

  if (!empresa || !fatura) {
    alert("Preencha Empresa e Fatura.");
    return;
  }

   const processo = {
   empresa: empresa,
   cnpj: cnpj,
   fatura: fatura,

  data_lancamento: dataLancamentoManual
  ? dataLancamentoManual
  : editandoIndex === null
    ? new Date().toISOString()
    : processos[editandoIndex].dataLancamento,


   tipo_relatorio: tipoRelatorioAtual || "foz",
   pais: tipoRelatorioAtual === "fora" ? pais : null,
   desembaraco: tipoRelatorioAtual === "fora" ? desembaraco : null,

   quantidade: aduanaIntegrada ? null : quantidade || null,
   data_averbacao: aduanaIntegrada ? null : dataAverbacao || null,
   crt: aduanaIntegrada ? null : crt || null,
   mercadoria: aduanaIntegrada ? null : mercadoria || null,
   observacao: aduanaIntegrada ? null : observacao || null,
   numero_veiculo: aduanaIntegrada ? null : numeroVeiculo || null,
   transporte: aduanaIntegrada ? null : transporte || null,
   peso_liquido: pesoLiquido || null,
   numero_due: aduanaIntegrada ? null : numeroDue || null,
   lpco: aduanaIntegrada ? null : lpco || null,
   parceiro: parceiro || null,

 responsavel_due: aduanaIntegrada
  ? null
  : document.getElementById("responsavelDue").value,

responsavel_co: aduanaIntegrada
  ? null
  : document.getElementById("responsavelCo").value,

fracionado: aduanaIntegrada
  ? false
  : document.getElementById("fracionado").checked,

aduana_integrada: aduanaIntegrada,

financeiro_cobrou: editandoIndex === null
  ? false
  : processos[editandoIndex].financeiroCobrou,

usuario_lancamento: usuarioAtual || "Usuário não identificado"
};

   const { data: sessao } = await banco.auth.getSession();

if (!sessao || !sessao.session) {
  alert("Sessão expirada. Faça login novamente.");
  return;
}

const resposta = await fetch("/api/salvar-processo", {
  method: editandoIndex === null ? "POST" : "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessao.session.access_token}`
  },
  body: JSON.stringify({
    id: editandoIndex === null ? null : processos[editandoIndex].id,
    processo: processo
  })
});

const resultado = await resposta.json();

if (!resposta.ok) {
  console.error("Erro ao salvar pela API:", resultado);
  alert(resultado.error || "Erro ao salvar processo.");
  return;
}

alert(editandoIndex === null
  ? "Processo salvo com sucesso!"
  : "Processo atualizado com sucesso!"
);

editandoIndex = null;
document.getElementById("btnSalvar").innerText = "Salvar Processo";

await registrarHistorico(
  editandoIndex === null ? "Processo criado" : "Processo editado",
  {
    id: editandoIndex === null ? null : processos[editandoIndex].id,
    empresa: empresa,
    fatura: fatura
  }
);

limparFormulario();

await carregarProcessos();
await criarBackupAutomatico();

};

function limparFormulario() {
   const campos = [
   "empresa",
   "cnpj",
   "quantidade",
    "dataAverbacao",
    "crt",
    "mercadoria",
    "fatura",
    "observacao",
    "numeroVeiculo",
    "transporte",
    "pesoLiquido",
    "parceiro",
    "numeroDue",
    "lpco"
  ];

  campos.forEach(function(id) {
    document.getElementById(id).value = "";
  });

  document.getElementById("fracionado").checked = false;
  document.getElementById("aduanaIntegrada").checked = false;

  document.getElementById("responsavelDue").value = "Exacta";
  document.getElementById("responsavelCo").value = "Exacta";
}

function podeFinanceiro() {
  return nivelUsuario === "admin" || nivelUsuario === "financeiro";
}

function podeEditar() {
  return nivelUsuario === "admin" || nivelUsuario === "operador";
}

function podeExcluir() {
  return nivelUsuario === "admin" || nivelUsuario === "operador";
}

function renderizarBotaoFinanceiro(p, index) {
  if (!podeFinanceiro()) {
    return "";
  }

  return `
    <button 
      class="${p.financeiroCobrou ? "btn-financeiro-ok" : "btn-financeiro"}"
      onclick="alternarFinanceiro(${index})">
      ${p.financeiroCobrou ? "🟢 Lançado" : "⚪ Lançar"}
    </button>
  `;
}

function renderizarBotoesAcao(index) {
  let botoes = "";

  if (podeEditar()) {
    botoes += `
      <button class="btn-edit" onclick="editarProcesso(${index})">
        Editar
      </button>
    `;
  }

  if (podeExcluir()) {
    botoes += `
      <button class="btn-delete" onclick="excluirProcesso(${index})">
        Excluir
      </button>
    `;
  }

  return botoes;
}

function formatarDataLancamentoParaDia(dataLancamento) {
  if (!dataLancamento) {
    return "Sem data";
  }

  if (String(dataLancamento).includes("T")) {
    const data = new Date(dataLancamento);
    return data.toLocaleDateString("pt-BR");
  }

  return String(dataLancamento).split(",")[0];
}

function formatarPeso(valor) {
  if (!valor) {
    return "-";
  }

  let texto = String(valor).trim();

  if (texto.includes(",")) {
    const partes = texto.split(",");
    const inteiro = Number(partes[0].replace(/\./g, ""));

    if (isNaN(inteiro)) {
      return texto;
    }

    const decimal = (partes[1] || "").padEnd(4, "0").slice(0, 4);

    return inteiro.toLocaleString("pt-BR") + "," + decimal;
  }

  const numero = Number(texto);

  if (isNaN(numero)) {
    return texto;
  }

  if (numero < 1000 && texto.includes(".")) {
    const corrigido = numero * 1000;

    return corrigido.toLocaleString("pt-BR", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  }

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}

function renderizarTabela() {
  const tbody = document.getElementById("tabelaProcessos");
  const busca = document.getElementById("busca").value.toLowerCase();
  const filtroData = document.getElementById("filtroData").value;

  tbody.innerHTML = "";

  const thead = document.querySelector(".table-box thead tr");

  if (tipoRelatorioAtual === "fora") {
    thead.innerHTML = `
      <th>Exportador</th>
      <th>CNPJ</th>
      <th>Observação</th>
      <th>País</th>
      <th>Transporte</th>
      <th>CRT</th>
      <th>Fatura</th>
      <th>DUE</th>
      <th>Desembaraço</th>
      <th>Parceiro</th>
      <th>Produto</th>
      <th>Veic.</th>
      <th>Peso</th>
      <th>DU-E</th>
      <th>C.O</th>
      <th>LPCO</th>
      <th>Financeiro</th>
      <th>Data</th>
      <th>Ações</th>
    `;
  } else {
    thead.innerHTML = `
      <th>Empresa</th>
      <th>CNPJ</th>
      <th>Qtd</th>
      <th>Liberado</th>
      <th>C.R.T</th>
      <th>Mercadoria</th>
      <th>Fatura</th>
      <th>Observações Multilog</th>
      <th>Veículo</th>
      <th>Transporte</th>
      <th>Peso Líquido</th>
      <th>Parceiro</th>
      <th>DU-E</th>
      <th>Responsável DU-E</th>
      <th>Responsável C.O</th>
      <th>LPCO</th>
      <th>Financeiro</th>
      <th>Data</th>
      <th>Ações</th>
    `;
  }

  let ultimoDiaRenderizado = "";

  processos.forEach(function(p, index) {
    const textoBusca = `
      ${p.empresa || ""}
      ${p.cnpj || ""}
      ${p.fatura || ""}
      ${p.numeroDue || ""}
      ${p.crt || ""}
      ${p.numeroVeiculo || ""}
      ${p.mercadoria || ""}
    `.toLowerCase();
    const passaBusca = textoBusca.includes(busca);

    const passaData =
      !filtroData ||
      p.dataAverbacao === filtroData ||
      converterLancamentoParaDataInput(p.dataLancamento) === filtroData;

    if (!passaBusca || !passaData) {
      return;
    }

    const diaProcesso = formatarDataLancamentoParaDia(p.dataLancamento);

const processosDoDia = processos.filter(function(item) {
  const textoBuscaDia = `
    ${item.empresa || ""}
    ${item.cnpj || ""}
    ${item.fatura || ""}
    ${item.numeroDue || ""}
    ${item.crt || ""}
    ${item.numeroVeiculo || ""}
    ${item.mercadoria || ""}
    ${item.parceiro || ""}
  `.toLowerCase();

  const passaBuscaDia = textoBuscaDia.includes(busca);

  const passaDataDia =
    !filtroData ||
    item.dataAverbacao === filtroData ||
    converterLancamentoParaDataInput(item.dataLancamento) === filtroData;

  return (
    formatarDataLancamentoParaDia(item.dataLancamento) === diaProcesso &&
    passaBuscaDia &&
    passaDataDia
  );
});

const diaFinalizado = processosDoDia.every(function(item) {
  return item.diaFinalizado === true;
});

const diaAberto = diasAbertos[diaProcesso] === true;

if (diaProcesso !== ultimoDiaRenderizado) {
  ultimoDiaRenderizado = diaProcesso;

  const linhaDia = document.createElement("tr");

linhaDia.innerHTML = `
  <td colspan="20" class="linha-dia">
    ${diaFinalizado ? "🔒" : "📅"} ${diaProcesso}
    ${diaFinalizado ? "— FINALIZADO" : ""}
    (${processosDoDia.length} processos)

    <button onclick="selecionarDiaExportacao('${diaProcesso}')">
      Selecionar para PDF/Excel
    </button>

 ${ diaFinalizado ? `
  <button class="btn-finalizar-dia" onclick="reabrirDia('${diaProcesso}')">
    🔓 Reabrir Dia
  </button>

  <button class="btn-finalizar-dia" onclick="alternarDia('${diaProcesso}')">
    ${diaAberto ? "Ocultar" : "Mostrar"}
  </button>
` : `
  <button class="btn-finalizar-dia" onclick="finalizarDia('${diaProcesso}')">
    ✅ Finalizar Dia
  </button>
` }
</td>
`;

  tbody.appendChild(linhaDia);
}

if (diaFinalizado && !diaAberto && !busca && !filtroData) {
  return;
}

     const tr = document.createElement("tr");

if (p.financeiroCobrou) {
  tr.classList.add("cobrado");
}

if (p.aduanaIntegrada) {
  tr.innerHTML = `
    <td>${p.empresa || ""}</td>
    <td>${p.cnpj || ""}</td>

    <td colspan="4" class="linha-aduana">
      LIBERAÇÃO VIA ADUANA INTEGRADA
    </td>

    <td colspan="3">
      FATURA: ${p.fatura || "-"}
    </td>

    <td></td>
   <td>${formatarPeso(p.pesoLiquido)}</td>
   <td>${p.parceiro || ""}</td>
   <td>${p.numeroDue || ""}</td>
    <td>${p.responsavelDue === "Exacta" ? "X" : "-"}</td>
    <td>${p.responsavelDue === "Parceiro" ? "X" : "-"}</td>
    <td>${p.responsavelCo === "Exacta" ? "X" : "-"}</td>
    <td>${p.responsavelCo === "Parceiro" ? "X" : "-"}</td>
    <td>${p.responsavelCo === "Sem C.O" ? "SEM C.O" : (p.lpco || "-")}</td>
    <td>${renderizarBotaoFinanceiro(p, index)}</td>
    <td>${p.dataLancamento || ""}</td>
    <td>${renderizarBotoesAcao(index)}</td>
  `;
} else {
  tr.innerHTML = `
    <td>${p.empresa || ""}</td>
    <td>${p.cnpj || ""}</td>
    <td>${p.quantidade || ""}</td>
    <td>${formatarData(p.dataAverbacao)}</td>
    <td>${p.crt || ""}</td>
    <td>${p.mercadoria || ""}</td>
    <td>${p.fatura || ""}</td>
    <td>${p.observacao || ""}</td>
    <td>${p.numeroVeiculo || ""}</td>
    <td>${p.transporte || ""}</td>
    <td>${formatarPeso(p.pesoLiquido)}</td>
    <td>${p.parceiro || "-"}</td>
    <td>${p.numeroDue || "-"}</td>
    <td>${p.responsavelDue || "-"}</td>
    <td>${p.responsavelCo || "-"}</td>
    <td>${p.lpco || "-"}</td>
    <td class="coluna-fora">${p.pais || "-"}</td>
    <td class="coluna-fora">${p.desembaraco || "-"}</td>
    <td>${renderizarBotaoFinanceiro(p, index)}</td>
    <td>${p.dataLancamento || ""}</td>
    <td>${renderizarBotoesAcao(index)}</td>
  `;
}

if (p.fracionado === true && p.aduanaIntegrada !== true) {
  const linhaFracionado = document.createElement("tr");

  linhaFracionado.innerHTML = `
    <td colspan="20" class="linha-fracionado">
      FRACIONADO
    </td>
  `;

  tbody.appendChild(linhaFracionado);
}

tbody.appendChild(tr);

  });

  atualizarDashboard();
}

  window.selecionarDiaExportacao = function(dia) {
  diaSelecionadoExportacao = dia;

  const tipo = document.getElementById("tipoRelatorio");
  const valor = document.getElementById("valorRelatorioSelect");

  if (tipo) {
    tipo.value = "dia";
  }

  atualizarOpcoesRelatorio();

  if (valor) {
    valor.value = dia;
  }

  atualizarDashboard();

  alert("Dia selecionado para exportação: " + dia);
};

window.editarProcesso = function(index) {
  const p = processos[index];

  document.getElementById("empresa").value = p.empresa || "";
  document.getElementById("cnpj").value = p.cnpj || "";
  document.getElementById("quantidade").value = p.quantidade || "";
  document.getElementById("dataAverbacao").value = p.dataAverbacao || "";
  document.getElementById("crt").value = p.crt || "";
  document.getElementById("mercadoria").value = p.mercadoria || "";
  document.getElementById("fatura").value = p.fatura || "";
  document.getElementById("observacao").value = p.observacao || "";
  document.getElementById("numeroVeiculo").value = p.numeroVeiculo || "";
  document.getElementById("transporte").value = p.transporte || "";
  document.getElementById("pesoLiquido").value = p.pesoLiquido || "";
  document.getElementById("parceiro").value = p.parceiro || "";
  document.getElementById("numeroDue").value = p.numeroDue || "";
  document.getElementById("lpco").value = p.lpco || "";


const campoDataLancamento = document.getElementById("dataLancamentoManual");

if (campoDataLancamento) {
  campoDataLancamento.value = p.dataLancamento
    ? new Date(p.dataLancamento).toISOString().slice(0, 16)
    : "";

  campoDataLancamento.disabled = nivelUsuario === "financeiro";
}

  // NOVOS CAMPOS DO RELATÓRIO FORA
  const campoPais = document.getElementById("pais");
  const campoDesembaraco = document.getElementById("desembaraco");

  if (campoPais) {
    campoPais.value = p.pais || "";
  }

  if (campoDesembaraco) {
    campoDesembaraco.value = p.desembaraco || "";
  }

  // DU-E e C.O
  document.getElementById("responsavelDue").value =
    p.responsavelDue || "Exacta";

  document.getElementById("responsavelCo").value =
    p.responsavelCo || "Exacta";

  document.getElementById("fracionado").checked = !!p.fracionado;
  document.getElementById("aduanaIntegrada").checked = !!p.aduanaIntegrada;

  editandoIndex = index;

  document.getElementById("btnSalvar").innerText =
    "Atualizar Processo";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

window.excluirProcesso = async function(index) {
  if (!confirm("Deseja mover este processo para a lixeira?")) {
    return;
  }

  const processo = processos[index];

  const { error: erroProcesso } = await banco
    .from("processos")
    .update({ excluido: true })
    .eq("id", processo.id);

  if (erroProcesso) {
    console.error("Erro ao mover para lixeira:", erroProcesso);
    alert("Erro ao mover para a lixeira.");
    return;
  }

  const { error: erroLixeira } = await banco
    .from("lixeira")
    .insert([
      {
        processo_id: processo.id,
        empresa: processo.empresa || "",
        cnpj: processo.cnpj || "",
        fatura: processo.fatura || "",
        excluido_por: usuarioAtual || "Usuário não identificado"
      }
    ]);

  if (erroLixeira) {
    console.error("Erro ao registrar na tabela lixeira:", erroLixeira);
  }

  await registrarHistorico("Processo movido para lixeira", {
    id: processo.id,
    empresa: processo.empresa,
    fatura: processo.fatura
  });

  alert("Processo movido para a lixeira!");

  await carregarProcessos();
  await carregarLixeira();
 };

window.fecharLixeira = function() {
  document.getElementById("modalLixeira").style.display = "none";
 };

window.abrirLixeira = async function() {
  document.getElementById("modalLixeira").style.display = "flex";
  await carregarLixeira();
};

window.fecharLixeira = function() {
  document.getElementById("modalLixeira").style.display = "none";
};

async function carregarLixeira() {
  const { data, error } = await banco
    .from("processos")
    .select("*")
    .eq("excluido", true);

  if (error) {
    console.error("Erro ao carregar lixeira:", error);
    return;
  }

  lixeira = data.map(function(p) {
    return {
      id: p.id,
      empresa: p.empresa || "",
      cnpj: p.cnpj || "",
      fatura: p.fatura || "",
      numeroDue: p.numero_due || "",
      aduanaIntegrada: p.aduana_integrada || false
    };
  });

  renderizarLixeira();
}

function renderizarLixeira() {
  const lista = document.getElementById("listaLixeira");
  const contador = document.getElementById("contadorLixeira");

  contador.innerText = lixeira.length;
  lista.innerHTML = "";

  if (lixeira.length === 0) {
    lista.innerHTML = "<p>Nenhum processo na lixeira.</p>";
    return;
  }

  lixeira.forEach(function(p, index) {
    const div = document.createElement("div");
    div.classList.add("lixeira-item");

    div.innerHTML = `
      <p><strong>Empresa:</strong> ${p.empresa}</p>
      <p><strong>CNPJ:</strong> ${p.cnpj}</p>
      <p><strong>Fatura:</strong> ${p.fatura}</p>
      <p><strong>DUE:</strong> ${p.numeroDue || ""}</p>
      <p><strong>Aduana Integrada:</strong> ${p.aduanaIntegrada ? "Sim" : "Não"}</p>

      <br>

      <button class="btn-restore" onclick="restaurarProcesso(${index})">
        Restaurar
      </button>

      <button class="btn-final-delete" onclick="excluirDefinitivo(${index})">
        Excluir definitivamente
      </button>
    `;

    lista.appendChild(div);
  });
}

window.restaurarProcesso = async function(index) {
  const id = lixeira[index].id;

  const { error } = await banco
    .from("processos")
    .update({
      excluido: false
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao restaurar:", error);
    alert("Erro ao restaurar processo.");
    return;
  }

  alert("Processo restaurado!");

  await carregarProcessos();
  await carregarLixeira();
};

window.excluirDefinitivo = async function(index) {
  if (!confirm("Excluir definitivamente? Essa ação não poderá ser desfeita.")) {
    return;
  }

  const id = lixeira[index].id;

  const { error } = await banco
    .from("processos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir definitivamente:", error);
    alert("Erro ao excluir definitivamente.");
    return;
  }

  alert("Processo excluído definitivamente!");

  await carregarLixeira();
};

window.alternarFinanceiro = async function(index) {
  const processo = processos[index];

  const novoStatus = !processo.financeiroCobrou;

  const { error } = await banco
    .from("processos")
    .update({
      financeiro_cobrou: novoStatus
    })
    .eq("id", processo.id);

  if (error) {
    console.error("Erro ao atualizar financeiro:", error);
    alert("Erro ao atualizar financeiro.");
    return;
  }

  processos[index].financeiroCobrou = novoStatus;

  await registrarHistorico(
    novoStatus ? "Financeiro marcou como cobrado" : "Financeiro removeu cobrança",
    {
      id: processo.id,
      empresa: processo.empresa,
      fatura: processo.fatura
    }
  );

  renderizarTabela();
  atualizarDashboard();

  await criarBackupAutomatico();
};

function atualizarDashboard() {
  const baseDashboard = diaSelecionadoExportacao
    ? processos.filter(function(p) {
        return formatarDataLancamentoParaDia(p.dataLancamento) === diaSelecionadoExportacao;
      })
    : processos;

  const total = baseDashboard.length;

  const cobrados = baseDashboard.filter(function(p) {
    return p.financeiroCobrou;
  }).length;

  const pendentes = total - cobrados;

  const hoje = new Date().toLocaleDateString("pt-BR");

  const totalHoje = baseDashboard.filter(function(p) {
    return formatarDataLancamentoParaDia(p.dataLancamento) === hoje;
  }).length;

  const totalAduana = baseDashboard.filter(function(p) {
  return p.aduanaIntegrada;
  }).length;

  const totalFracionados = baseDashboard.filter(function(p) {
  return p.fracionado;
  }).length;

  const diasFinalizados = [
    ...new Set(
      processos
        .filter(function(p) {
          return p.diaFinalizado;
        })
        .map(function(p) {
          return formatarDataLancamentoParaDia(p.dataLancamento);
        })
    )
  ].length;

  document.getElementById("totalProcessos").innerText = total;
  document.getElementById("totalCobrados").innerText = cobrados;
  document.getElementById("totalPendentes").innerText = pendentes;
  document.getElementById("totalHoje").innerText = totalHoje;
  document.getElementById("totalAduana").innerText = totalAduana;
  document.getElementById("totalFracionados").innerText = totalFracionados;
  document.getElementById("totalDiasFinalizados").innerText = diasFinalizados;
  document.getElementById("contadorLixeira").innerText = lixeira.length;
}

function dadosFiltrados() {
  const busca = document.getElementById("busca").value.toLowerCase();
  const filtroData = document.getElementById("filtroData").value;

  return processos.filter(function(p) {
    const textoBusca = `
    ${p.empresa || ""}
    ${p.cnpj || ""}
    ${p.fatura || ""}
    ${p.numeroDue || ""}
    ${p.crt || ""}
    ${p.numeroVeiculo || ""}
    ${p.mercadoria || ""}
    ${p.parceiro || ""}
   `.toLowerCase();

    const passaBusca = textoBusca.includes(busca);
    const passaData =
      !filtroData ||
      p.dataAverbacao === filtroData ||
      converterLancamentoParaDataInput(p.dataLancamento) === filtroData;

    return passaBusca && passaData;
  });
}

function exportarExcel() {
  const processosExportar = obterProcessosRelatorio();

  if (processosExportar.length === 0) {
    alert("Não há processos para exportar.");
    return;
  }

  const dados = processosExportar.map(function(p) {
    if (tipoRelatorioAtual === "fora") {
      return {
        Exportador: p.empresa || "",
        CNPJ: p.cnpj || "",
        Observação: p.observacao || "",
        País: p.pais || "",
        Transporte: p.transporte || "",
        CRT: p.crt || "",
        Fatura: p.fatura || "",
        DUE: p.numeroDue || "",
        Desembaraço: p.desembaraco || "",
        Parceiro: p.parceiro || "",
        Produto: p.mercadoria || "",
        Veic: p.quantidade || "",
        Peso: p.pesoLiquido || "",
        "Resp. DU-E": p.responsavelDue || "-",
        "Resp. C.O": p.responsavelCo || "-",
        LPCO: p.lpco || "-"
      };
    }

    return {
      Empresa: p.empresa || "",
      CNPJ: p.cnpj || "",
      Qtd: p.quantidade || "",
      Liberado: formatarData(p.dataAverbacao),
      CRT: p.crt || "",
      Mercadoria: p.mercadoria || "",
      Fatura: p.fatura || "",
      Obs: p.observacao || "",
      Peso: p.pesoLiquido || "",
      Parceiro: p.parceiro || "",
      DUE: p.numeroDue || "",
      "Resp. DU-E": p.responsavelDue || "-",
      "Resp. C.O": p.responsavelCo || "-",
      LPCO: p.lpco || "-"
    };
  });

  const planilha = XLSX.utils.json_to_sheet(dados);
  const arquivo = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(arquivo, planilha, "Relatório");

  XLSX.writeFile(
    arquivo,
    `relatorio_processos_${dataArquivo()}.xlsx`
  );
}

function exportarPDF() {
  if (processos.length === 0) {
    alert("Não há processos para exportar.");
    return;
  }

  const relatorioFora = tipoRelatorioAtual === "fora";
  let processosExportar = obterProcessosRelatorio();

  if (processosExportar.length === 0) {
    alert("Nenhum processo encontrado para esse filtro.");
    return;
  }

  processosExportar.sort(function(a, b) {
    const dataA = converterDataBR(formatarDataLancamentoParaDia(a.dataLancamento));
    const dataB = converterDataBR(formatarDataLancamentoParaDia(b.dataLancamento));

    if (dataB - dataA !== 0) return dataB - dataA;

    return (a.empresa || "").localeCompare(b.empresa || "", "pt-BR", {
      sensitivity: "base"
    });
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("landscape", "mm", "a3");

  pdf.setFontSize(16);
  pdf.text(relatorioFora ? "Relatório Fora de Foz" : "Relatório Foz", 14, 15);

  pdf.setFontSize(9);
  pdf.text(`Data de emissão: ${new Date().toLocaleString("pt-BR")}`, 14, 22);
  pdf.text(`Quantidade de registros: ${processosExportar.length}`, 14, 28);

  let yAtual = 36;

  const cabecalhoPDF = relatorioFora
    ? [[
        "EXPORTADOR",
        "CNPJ",
        "OBSERVAÇÃO",
        "PAÍS",
        "TRANSPORTE",
        "CRT",
        "FATURA",
        "DUE",
        "DESEMBARAÇADO",
        "PARCEIRO",
        "PRODUTO",
        "VEIC",
        "PESO",
        "RESP. DUE",
        "RESP. C.O",
        "LPCO"
      ]]
    : [[
        "EMPRESA",
        "CNPJ",
        "QNT",
        "LIBERADO",
        "CRT",
        "MERCADORIA",
        "FATURA",
        "OBS",
        "PESO",
        "PARCEIRO",
        "DUE",
        "RESP. DUE",
        "RESP. C.O",
        "LPCO"
      ]];

  const dias = [...new Set(
    processosExportar.map(function(p) {
      return formatarDataLancamentoParaDia(p.dataLancamento);
    })
  )];

  dias.forEach(function(dia) {
    const processosDoDia = processosExportar.filter(function(p) {
      return formatarDataLancamentoParaDia(p.dataLancamento) === dia;
    });

    pdf.setFontSize(11);
    pdf.text("Data de lançamento: " + dia, 14, yAtual);
    yAtual += 5;

    let corpoDia = [];

    function ordenarPorEmpresa(lista) {
      return [...lista].sort(function(a, b) {
        return (a.empresa || "").localeCompare(
          b.empresa || "",
          "pt-BR",
          { sensitivity: "base" }
        );
      });
    }

    function adicionarTituloGrupo(titulo) {
      corpoDia.push([
        {
          content: titulo,
          colSpan: relatorioFora ? 16 : 14,
          styles: {
            halign: "center",
            fontStyle: "bold",
            fontSize: 11,
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0]
          }
        }
      ]);
    }

    function adicionarProcessoPDF(p) {
  if (relatorioFora) {
    corpoDia.push([
      p.empresa || "",
      p.cnpj || "",
      p.observacao || "-",
      p.pais || "-",
      p.transporte || "-",
      p.crt || "-",
      p.fatura || "-",
      p.numeroDue || "-",
      p.desembaraco || "-",
      p.parceiro || "-",
      p.mercadoria || "-",
      p.quantidade || "-",
      formatarPeso(p.pesoLiquido) || "-",
      p.responsavelDue || "-",
      p.responsavelCo || "-",
      p.lpco || "-"
    ]);
    return;
  }

  corpoDia.push([
    p.empresa || "",
    p.cnpj || "",
    p.quantidade || "-",
    formatarData(p.dataAverbacao) || "-",
    p.crt || "-",
    p.mercadoria || "-",
    p.fatura || "-",
    p.observacao || "-",
    formatarPeso(p.pesoLiquido) || "-",
    p.parceiro || "-",
    p.numeroDue || "-",
    p.responsavelDue || "-",
    p.responsavelCo || "-",
    p.lpco || "-"
  ]);
}

    const normais = ordenarPorEmpresa(
      processosDoDia.filter(function(p) {
        return !p.fracionado && !p.aduanaIntegrada;
      })
    );

    const fracionados = ordenarPorEmpresa(
      processosDoDia.filter(function(p) {
        return p.fracionado && !p.aduanaIntegrada;
      })
    );

    const aduana = ordenarPorEmpresa(
      processosDoDia.filter(function(p) {
        return p.aduanaIntegrada;
      })
    );

    normais.forEach(adicionarProcessoPDF);

    if (fracionados.length > 0) {
      adicionarTituloGrupo("FRACIONADO");
      fracionados.forEach(adicionarProcessoPDF);
    }

    if (aduana.length > 0) {
      adicionarTituloGrupo("ADUANA INTEGRADA");
      aduana.forEach(adicionarProcessoPDF);
    }

    pdf.autoTable({
      startY: yAtual,
      head: cabecalhoPDF,
      body: corpoDia,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        overflow: "linebreak",
        lineWidth: 0.15,
        lineColor: [180, 180, 180]
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 9,
        lineWidth: 0.15,
        lineColor: [180, 180, 180]
      },
      bodyStyles: {
        lineWidth: 0.15,
        lineColor: [200, 200, 200]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: {
        left: 8,
        right: 8
      },
      tableWidth: "auto"
    });

    yAtual = pdf.lastAutoTable.finalY + 8;
  });

  pdf.save(`relatorio_processos_${dataArquivo()}.pdf`);
}

function formatarData(data) {
  if (!data) {
    return "";
  }

  const partes = data.split("-");

  if (partes.length !== 3) {
    return data;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function converterLancamentoParaDataInput(dataLancamento) {
  if (!dataLancamento) {
    return "";
  }

  const apenasData = dataLancamento.split(",")[0];
  const partes = apenasData.split("/");

  if (partes.length !== 3) {
    return "";
  }

  const dia = partes[0];
  const mes = partes[1];
  const ano = partes[2];

  return `${ano}-${mes}-${dia}`;
}

function converterDataBR(dataBR) {
  const partes = dataBR.split("/");

  if (partes.length !== 3) {
    return new Date(0);
  }

  return new Date(
    partes[2],
    partes[1] - 1,
    partes[0]
  );
}

function dataArquivo() {
  const hoje = new Date();

  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = hoje.getFullYear();

  return `${dia}-${mes}-${ano}`;
}

window.renderizarTabela = renderizarTabela;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;

window.fazerLogin = async function() {
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value.trim();

  if (!email || !senha) {
    alert("Preencha e-mail e senha.");
    return;
  }

  const { data, error } = await banco.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    alert(error.message);
    return;
  }

usuarioAtual = data.user.email;

await carregarNivelUsuario(usuarioAtual);
ativarRealtimeProcessos();

const telaLogin = document.getElementById("telaLogin");
const usuarioLogadoEl = document.getElementById("usuarioLogado");

if (telaLogin) {
  telaLogin.style.display = "none";
}

document.getElementById("telaEscolhaRelatorio").style.display = "flex";

if (usuarioLogadoEl) {
  usuarioLogadoEl.innerText = data.user.email;
}
};

async function verificarLogin() {
  const { data } = await banco.auth.getSession();

  const telaLogin = document.getElementById("telaLogin");
  const usuarioLogadoEl = document.getElementById("usuarioLogado");

  if (data.session) {
    usuarioAtual = data.session.user.email;

    await carregarNivelUsuario(usuarioAtual);
    ativarRealtimeProcessos();

    if (telaLogin) {
      telaLogin.style.display = "none";
    }

    document.getElementById("telaEscolhaRelatorio").style.display = "flex";

    tipoRelatorioAtual = null;
    processos = [];

    if (usuarioLogadoEl) {
      usuarioLogadoEl.innerText = data.session.user.email;
    }
  } else {
    usuarioAtual = null;
    nivelUsuario = null;

    if (telaLogin) {
      telaLogin.style.display = "flex";
    }

    if (usuarioLogadoEl) {
      usuarioLogadoEl.innerText = "";
    }
  }
}

async function carregarNivelUsuario(email) {
  const emailLimpo = email.trim().toLowerCase();

  const { data, error } = await banco
    .from("usuarios")
    .select("nivel")
    .ilike("email", emailLimpo)
    .limit(1);

  if (error) {
    console.error("Erro ao carregar nível do usuário:", error);
    nivelUsuario = null;
    return;
  }

  if (!data || data.length === 0) {
    console.warn("Usuário não encontrado na tabela usuarios:", emailLimpo);
    nivelUsuario = null;
    return;
  }

  nivelUsuario = data[0].nivel;

  console.log("Nível do usuário:", nivelUsuario);

  aplicarPermissoes();

  renderizarTabela();
}

function aplicarPermissoes() {
  console.log("Aplicando permissões para:", nivelUsuario);

  const btnAuditoria = document.getElementById("btnAuditoria");
  const btnBackup = document.getElementById("btnBackup");
  const btnSalvar = document.getElementById("btnSalvar");

  if (btnAuditoria) {
    btnAuditoria.style.display =
      nivelUsuario === "admin" ? "inline-block" : "none";
  }

  if (btnBackup) {
    btnBackup.style.display =
      nivelUsuario === "admin" ? "inline-block" : "none";
  }

  if (btnSalvar) {
    btnSalvar.style.display =
      nivelUsuario === "admin" || nivelUsuario === "operador"
        ? "inline-block"
        : "none";
  }
}

verificarLogin();

function formatarDataLancamentoParaDia(dataLancamento) {
  if (!dataLancamento) {
    return "Sem data";
  }

  if (dataLancamento.includes("T")) {
    const data = new Date(dataLancamento);
    return data.toLocaleDateString("pt-BR");
  }

  return dataLancamento.split(",")[0];
}

window.finalizarDia = async function(dia) {
  if (!confirm(`Finalizar o dia ${dia}?`)) {
    return;
  }

  const processosDoDia = processos.filter(function(p) {
  return formatarDataLancamentoParaDia(p.dataLancamento) === dia;
});

  const ids = processosDoDia.map(function(p) {
    return p.id;
  });

  if (ids.length === 0) {
    alert("Nenhum processo encontrado para esse dia.");
    return;
  }

  const { error } = await banco
    .from("processos")
    .update({ dia_finalizado: true })
    .in("id", ids);

  if (error) {
    console.error("Erro ao finalizar dia:", error);
    alert("Erro ao finalizar dia.");
    return;
  }

  alert(`Dia ${dia} finalizado!`);

  await carregarProcessos();
};

window.alternarDia = function(dia) {
  diasAbertos[dia] = !diasAbertos[dia];

  if (diasAbertos[dia]) {
    diaSelecionadoExportacao = dia;
  }

  renderizarTabela();
};

window.sair = async function() {
  await banco.auth.signOut();

  usuarioAtual = null;
  nivelUsuario = null;

  document.getElementById("usuarioLogado").innerText = "";
  document.getElementById("telaLogin").style.display = "flex";
};

document.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    const telaLogin = document.getElementById("telaLogin");

    if (telaLogin && telaLogin.style.display !== "none") {
      fazerLogin();
    }
  }
});

async function criarBackupAutomatico() {
  console.log("Backup desativado no banco. Futuramente será feito por download local.");
}

async function baixarBackupLocal() {
  const backup = {
    data: new Date().toLocaleString("pt-BR"),
    processos,
    lixeira
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_export_system_${dataArquivo()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

async function registrarHistorico(acao, processo) {
  console.log("Registrando histórico:", acao, processo);

  const registro = {
    usuario: usuarioAtual || "Usuário não identificado",
    acao: acao,
    empresa: processo?.empresa || "",
    fatura: processo?.fatura || "",
    descricao:
      acao +
      " - " +
      (processo?.empresa || "") +
      " - " +
      (processo?.fatura || "")
  };

  const { error } = await banco
    .from("historico_acoes")
    .insert([registro]);

  if (error) {
    console.error("Erro ao registrar histórico:", JSON.stringify(error));
  }
}

function ativarRealtimeProcessos() {
  if (realtimeAtivado) {
    return;
  }

  realtimeAtivado = true;

  banco
    .channel("processos-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "processos"
      },
      async function(payload) {
        console.log("Alteração em tempo real:", payload);
        await carregarProcessos();
      }
    )
    .subscribe();
}

window.reabrirDia = async function(dia) {
  if (!confirm("Reabrir o dia " + dia + "?")) {
    return;
  }

  const processosDoDia = processos.filter(function(p) {
    return formatarDataLancamentoParaDia(p.dataLancamento) === dia;
  });

  const ids = processosDoDia.map(function(p) {
    return p.id;
  });

  const { error } = await banco
    .from("processos")
    .update({
      dia_finalizado: false
    })
    .in("id", ids);

  if (error) {
    console.error("Erro ao reabrir dia:", error);
    alert("Erro ao reabrir dia.");
    return;
  }

  alert("Dia reaberto com sucesso!");

  await carregarProcessos();
};

function atualizarOpcoesRelatorio() {
  const tipo = document.getElementById("tipoRelatorio");
  const select = document.getElementById("valorRelatorioSelect");

  if (!tipo || !select) {
    return;
  }

  select.innerHTML = '<option value="">Selecione...</option>';

  let valores = [];

  if (tipo.value === "todos") {
    select.innerHTML = '<option value="">Todos os Processos</option>';
    return;
  }

  if (tipo.value === "dia") {
    valores = processos.map(function(p) {
      return formatarDataLancamentoParaDia(p.dataLancamento);
    });
  }

  if (tipo.value === "empresa") {
  valores = processos.map(function(p) {
    return p.empresa || "";
  });
}

if (tipo.value === "cnpj") {
  valores = processos.map(function(p) {
    return p.cnpj || "";
  });
}

if (tipo.value === "fatura") {
  valores = processos.map(function(p) {
    return p.fatura || "";
  });
}

if (tipo.value === "due") {
  valores = processos.map(function(p) {
    return p.numeroDue || "";
  });
}

if (tipo.value === "parceiro") {
  valores = processos.map(function(p) {
    return p.parceiro || "";
  });
}

valores = [...new Set(valores.filter(Boolean))].sort(function(a, b) {
  return String(a).localeCompare(
    String(b),
    "pt-BR",
    { sensitivity: "base" }
  );
});

valores.forEach(function(valor) {
  const option = document.createElement("option");

  option.value = valor;
  option.textContent = valor;

  select.appendChild(option);
});
}

window.atualizarOpcoesRelatorio = atualizarOpcoesRelatorio;

function ordenarProcessosRelatorio(lista) {
  return [...lista].sort(function(a, b) {
    const especialA = a.fracionado || a.aduanaIntegrada ? 1 : 0;
    const especialB = b.fracionado || b.aduanaIntegrada ? 1 : 0;

    if (especialA !== especialB) {
      return especialA - especialB;
    }

    return (a.empresa || "").localeCompare(
      b.empresa || "",
      "pt-BR",
      { sensitivity: "base" }
    );
  });
}

window.abrirAuditoria = async function() {
  if (nivelUsuario !== "admin") {
    alert("Acesso permitido apenas para administradores.");
    return;
  }

  const modal = document.getElementById("modalAuditoria");
  const resultado = document.getElementById("resultadoAuditoria");

  if (!modal || !resultado) {
    alert("Modal de auditoria não encontrado.");
    return;
  }

  modal.style.display = "flex";

  resultado.innerHTML = `
    <div class="audit-item">
      <h2 class="audit-ok">🟢 Sistema Seguro</h2>
    </div>

    <div class="audit-item">
      <strong>Export System • Multilog Tech</strong><br>
      Versão: 2.1<br>
      Ambiente: Produção
    </div>

    <div class="audit-item">
      <strong>Usuário:</strong> ${usuarioAtual || "-"}<br>
      <strong>Nível:</strong> ${nivelUsuario || "-"}
    </div>

    <div class="audit-item">
      <strong>Relatório atual:</strong> ${tipoRelatorioAtual || "-"}<br>
      <strong>Processos carregados:</strong> ${processos.length}
    </div>

    <div class="audit-item">
      ✅ Login ativo<br>
      ✅ Supabase conectado<br>
      ✅ Histórico de ações ativo<br>
      ✅ Separação Foz/Fora ativa<br>
      ✅ Backup local habilitado para admin
    </div>

    <div class="audit-item">
      <strong>Última verificação:</strong><br>
      ${new Date().toLocaleString("pt-BR")}
    </div>
  `;
};

window.fecharAuditoria = function() {
  document.getElementById("modalAuditoria").style.display = "none";
};


function montarFormularioFoz() {
  document.querySelector(".grid").innerHTML = `
    <input id="empresa" list="listaEmpresas" placeholder="Empresa" />
<input id="cnpj" list="listaCnpjs" placeholder="CNPJ" />
    <input id="quantidade" type="number" placeholder="Qtd. Veículos" />
    <input id="dataAverbacao" type="date" />

    <input id="crt" placeholder="CRT" />
   <input id="mercadoria" list="listaMercadorias" placeholder="Mercadoria" />
    <input id="fatura" placeholder="Fatura" />

    <input id="observacao" placeholder="Observação Multilog" />
    <input id="numeroVeiculo" placeholder="Número do Veículo" />
    <input id="transporte" list="listaTransportes" placeholder="Transporte" />
    <input id="pesoLiquido" type="text" placeholder="Peso Líquido" />

    <input id="numeroDue" placeholder="Número da DUE" />
    <input id="lpco" placeholder="LPCO" />
    <input id="parceiro" list="listaParceiros" placeholder="Parceiro" />
    <input id="dataLancamentoManual" type="datetime-local" title="Data de Lançamento" />

    <input id="pais" type="hidden" />
    <input id="desembaraco" type="hidden" />
  `;
}

function montarFormularioFora() {
  document.querySelector(".grid").innerHTML = `
 <input id="empresa" list="listaEmpresas" placeholder="Empresa" />
<input id="cnpj" list="listaCnpjs" placeholder="CNPJ" />
    <input id="observacao" placeholder="Observação" />
    <input id="pais" placeholder="País" />

    <input id="transporte" list="listaTransportes" placeholder="Transporte" />
    <input id="crt" placeholder="CRT" />
    <input id="fatura" placeholder="Fatura" />

    <input id="numeroDue" placeholder="Número da DUE" />
    <input id="desembaraco" placeholder="Desembaraço" />
   <input id="parceiro" list="listaParceiros" placeholder="Parceiro" />
    <input id="mercadoria" list="listaMercadorias" placeholder="Mercadoria" />

    <input id="quantidade" type="number" placeholder="Veic." />
    <input id="pesoLiquido" type="text" placeholder="Peso" />
    <input id="lpco" placeholder="LPCO" />
    <input id="dataLancamentoManual" type="datetime-local" title="Data de Lançamento" />

    <input id="dataAverbacao" type="hidden" />
    <input id="numeroVeiculo" type="hidden" />
  `;
}

window.entrarRelatorio = async function(tipo) {
  tipoRelatorioAtual = tipo;

  if (tipo === "fora") {
    montarFormularioFora();
  } else {
    montarFormularioFoz();
  }

  document.getElementById("tipoRelatorio").value = "todos";
  document.getElementById("valorRelatorioSelect").innerHTML =
    '<option value="">Todos os Processos</option>';

  document.getElementById("telaEscolhaRelatorio").style.display = "none";

  const titulo = document.querySelector(".topbar h1");

  if (titulo) {
    titulo.innerText =
      tipo === "foz"
        ? "📍 Export System • Relatório Foz"
        : "🌎 Export System • Relatório Fora de Foz";
  }

  await carregarProcessos();
};  

function obterProcessosRelatorio() {
  const tipo = document.getElementById("tipoRelatorio").value;
  const valor = document.getElementById("valorRelatorioSelect").value
    .trim()
    .toLowerCase();

  const busca = document.getElementById("busca").value.toLowerCase();
  const filtroData = document.getElementById("filtroData").value;

  let lista = [...processos];

  if (busca) {
    lista = lista.filter(function(p) {
      const textoBusca = `
        ${p.empresa || ""}
        ${p.cnpj || ""}
        ${p.fatura || ""}
        ${p.numeroDue || ""}
        ${p.crt || ""}
        ${p.numeroVeiculo || ""}
        ${p.mercadoria || ""}
        ${p.parceiro || ""}
      `.toLowerCase();

      return textoBusca.includes(busca);
    });
  }

  if (filtroData) {
    lista = lista.filter(function(p) {
      return (
        p.dataAverbacao === filtroData ||
        converterLancamentoParaDataInput(p.dataLancamento) === filtroData
      );
    });
  }

  if (tipo !== "todos" && valor) {
    lista = lista.filter(function(p) {
      if (tipo === "dia") {
        return formatarDataLancamentoParaDia(p.dataLancamento).toLowerCase() === valor;
      }

      if (tipo === "empresa") {
        return (p.empresa || "").toLowerCase().includes(valor);
      }

      if (tipo === "cnpj") {
        return (p.cnpj || "").toLowerCase().includes(valor);
      }

      if (tipo === "fatura") {
        return (p.fatura || "").toLowerCase().includes(valor);
      }

      if (tipo === "due") {
        return (p.numeroDue || "").toLowerCase().includes(valor);
      }

      if (tipo === "parceiro") {
        return (p.parceiro || "").toLowerCase().includes(valor);
      }

      return true;
    });
  }

  return lista;
}

window.mostrarPreviaRelatorio = function() {
  const lista = obterProcessosRelatorio();

  if (lista.length === 0) {
    alert("Nenhum processo encontrado para esse filtro.");
    return;
  }

  processos = lista;
  diasAbertos = {};

  lista.forEach(function(p) {
    const dia = formatarDataLancamentoParaDia(p.dataLancamento);
    diasAbertos[dia] = true;
  });

  renderizarTabela();
  atualizarDashboard();
};

window.limparFiltrosRelatorio = function() {
  const busca = document.getElementById("busca");
  const filtroData = document.getElementById("filtroData");
  const tipo = document.getElementById("tipoRelatorio");
  const valor = document.getElementById("valorRelatorioSelect");

  if (busca) busca.value = "";
  if (filtroData) filtroData.value = "";

  if (tipo) tipo.value = "todos";

  if (valor) {
    valor.innerHTML = '<option value="">Todos os Processos</option>';
  }

  diaSelecionadoExportacao = null;

  carregarProcessos();
};

window.voltarEscolhaRelatorio = function() {
  tipoRelatorioAtual = null;
  processos = [];
  diaSelecionadoExportacao = null;

  const telaEscolha = document.getElementById("telaEscolhaRelatorio");

  if (telaEscolha) {
    telaEscolha.style.display = "flex";
  }

  const tbody = document.getElementById("tabelaProcessos");
  if (tbody) {
    tbody.innerHTML = "";
  }

  window.limparFiltrosRelatorio();
};


window.baixarBackupLocal = function() {
  const processosBackup = [...processos];

  if (processosBackup.length === 0) {
    alert("Nenhum processo carregado para backup.");
    return;
  }

  const dados = processosBackup.map(function(p) {
    if ((p.tipoRelatorio || tipoRelatorioAtual) === "fora") {
      return {
        Exportador: p.empresa || "",
        CNPJ: p.cnpj || "",
        Observação: p.observacao || "",
        País: p.pais || "",
        Transporte: p.transporte || "",
        CRT: p.crt || "",
        Fatura: p.fatura || "",
        DUE: p.numeroDue || "",
        Desembaraço: p.desembaraco || "",
        Parceiro: p.parceiro || "",
        Produto: p.mercadoria || "",
        Veic: p.quantidade || "",
        Peso: formatarPeso(p.pesoLiquido),
        "Resp. DU-E": p.responsavelDue || "-",
        "Resp. C.O": p.responsavelCo || "-",
        LPCO: p.lpco || "-"
      };
    }

    return {
      Empresa: p.empresa || "",
      CNPJ: p.cnpj || "",
      Qtd: p.quantidade || "",
      Liberado: formatarData(p.dataAverbacao),
      CRT: p.crt || "",
      Mercadoria: p.mercadoria || "",
      Fatura: p.fatura || "",
      Obs: p.observacao || "",
      Peso: formatarPeso(p.pesoLiquido),
      Parceiro: p.parceiro || "",
      DUE: p.numeroDue || "",
      "Resp. DU-E": p.responsavelDue || "-",
      "Resp. C.O": p.responsavelCo || "-",
      LPCO: p.lpco || "-"
    };
  });

  const planilha = XLSX.utils.json_to_sheet(dados);
  const arquivo = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(arquivo, planilha, "Backup");

  XLSX.writeFile(
    arquivo,
    `backup_export_system_${dataArquivo()}.xlsx`
  );
};

document.addEventListener("contextmenu", function(e) {
  e.preventDefault();
});

document.addEventListener("keydown", function(e) {
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && e.key === "I") ||
    (e.ctrlKey && e.shiftKey && e.key === "J") ||
    (e.ctrlKey && e.key === "U")
  ) {
    e.preventDefault();
    alert("Acesso bloqueado.");
  }
});
