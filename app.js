console.log("APP.JS CARREGOU");

const SUPABASE_URL = "https://ayekrvnqjtmpvjtrwqnd.supabase.co";
const SUPABASE_KEY = "sb_publishable_e9EC0WSIoq3ISWipVj1TTA_a_ZG1Bz0";

const banco = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase conectado:", banco);

let processos = [];
let lixeira = [];
let editandoIndex = null;
let diasAbertos = {};
let diaSelecionadoExportacao = null;
let usuarioAtual = null;
let nivelUsuario = null;
let nivelUsuario = null;

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

async function carregarProcessos() {

  mostrarLoading();

  const { data, error } = await banco
    .from("processos")
    .select("*")
    .eq("excluido", false);

  if (error) {
    console.error("Erro ao carregar processos:", error);
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
      financeiroCobrou: p.financeiro_cobrou || false,
      dataLancamento: p.data_lancamento || "",
      diaFinalizado: p.dia_finalizado || false
    };
  });

processos.sort(function(a, b) {
  const dataA = new Date(a.dataLancamento);
  const dataB = new Date(b.dataLancamento);

  return dataB - dataA;
});

renderizarTabela();

esconderLoading();
}

window.salvarProcesso = async function () {
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
  const pesoLiquido = valor("pesoLiquido");
  const numeroDue = valor("numeroDue").trim();
  const lpco = valor("lpco").trim();

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

    responsavel_due: aduanaIntegrada
      ? null
      : document.querySelector('input[name="due"]:checked')?.value || null,

    responsavel_co: aduanaIntegrada
      ? null
      : document.querySelector('input[name="co"]:checked')?.value || null,

    fracionado: aduanaIntegrada
      ? false
      : document.getElementById("fracionado").checked,

    aduana_integrada: aduanaIntegrada,

    financeiro_cobrou: editandoIndex === null
      ? false
      : processos[editandoIndex].financeiroCobrou,

    usuario_lancamento: usuarioAtual || "Usuário não identificado"
  };

  if (editandoIndex === null) {
    const { error } = await banco
      .from("processos")
      .insert([processo]);

    if (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar processo.");
      return;
    }

    alert("Processo salvo com sucesso!");
  } else {
    const id = processos[editandoIndex].id;

    const { error } = await banco
      .from("processos")
      .update(processo)
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao atualizar processo.");
      return;
    }

    alert("Processo atualizado com sucesso!");

    editandoIndex = null;
    document.getElementById("btnSalvar").innerText = "Salvar Processo";
  }

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
    "numeroDue",
    "lpco"
  ];

  campos.forEach(function(id) {
    document.getElementById(id).value = "";
  });

  document.getElementById("fracionado").checked = false;
  document.getElementById("aduanaIntegrada").checked = false;

  document.querySelector('input[name="due"][value="Exacta"]').checked = true;
  document.querySelector('input[name="co"][value="Exacta"]').checked = true;
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
      ${p.financeiroCobrou ? "🟢 Cobrado" : "⚪ Cobrar"}
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

function renderizarTabela() {
  const tbody = document.getElementById("tabelaProcessos");
  const busca = document.getElementById("busca").value.toLowerCase();
  const filtroData = document.getElementById("filtroData").value;

  tbody.innerHTML = "";

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
  return formatarDataLancamentoParaDia(item.dataLancamento) === diaProcesso;
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

    ${
      diaFinalizado
        ? `
          <button class="btn-finalizar-dia" onclick="alternarDia('${diaProcesso}')">
            ${diaAberto ? "Ocultar" : "Mostrar"}
          </button>
        `
        : `
          <button class="btn-finalizar-dia" onclick="finalizarDia('${diaProcesso}')">
            ✅ Finalizar Dia
          </button>
        `
    }
  </td>
`;

  tbody.appendChild(linhaDia);
}

if (diaFinalizado && !diaAberto) {
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
    <td>${p.pesoLiquido || ""}</td>
    <td>${p.numeroDue || "-"}</td>
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
    <td>${p.pesoLiquido || ""}</td>
    <td>${p.numeroDue || ""}</td>
    <td>${p.responsavelDue === "Exacta" ? "Exacta" : "-"}</td>
    <td>${p.responsavelDue === "Parceiro" ? "Parceiro" : "-"}</td>
    <td>${p.responsavelCo === "Exacta" ? "Exacta" : "-"}</td>
    <td>${p.responsavelCo === "Parceiro" ? "Parceiro" : "-"}</td>
    <td>${p.lpco || "-"}</td>
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
  document.getElementById("numeroDue").value = p.numeroDue || "";
  document.getElementById("lpco").value = p.lpco || "";

  document.getElementById("fracionado").checked = !!p.fracionado;
  document.getElementById("aduanaIntegrada").checked = !!p.aduanaIntegrada;

  const dueRadio = document.querySelector(
    `input[name="due"][value="${p.responsavelDue || "Exacta"}"]`
  );

  const coRadio = document.querySelector(
    `input[name="co"][value="${p.responsavelCo || "Exacta"}"]`
  );

  if (dueRadio) {
    dueRadio.checked = true;
  }

  if (coRadio) {
    coRadio.checked = true;
  }

  editandoIndex = index;

  document.getElementById("btnSalvar").innerText = "Atualizar Processo";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

window.excluirProcesso = async function(index) {
  if (!confirm("Deseja mover este processo para a lixeira?")) {
    return;
  }

  const id = processos[index].id;

  const { error } = await banco
    .from("processos")
    .update({ excluido: true })
    .eq("id", id);

  if (error) {
    console.error("Erro ao mover para lixeira:", error);
    alert("Erro ao mover para a lixeira.");
    return;
  }

  alert("Processo movido para a lixeira!");

  await carregarLixeira();
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
      ${p.empresa}
      ${p.fatura}
      ${p.numeroDue}
      ${p.crt}
      ${p.numeroVeiculo}
      ${p.mercadoria}
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
  if (!diaSelecionadoExportacao) {
    alert("Selecione um dia antes de exportar.");
    return;
  }

  const processosExportar = processos.filter(function(p) {
    return formatarDataLancamentoParaDia(p.dataLancamento) === diaSelecionadoExportacao;
  });

  if (processosExportar.length === 0) {
    alert("Não há processos para exportar neste dia.");
    return;
  }

  const dados = processosExportar.map(function(p) {
    return {
      Empresa: p.empresa,
      CNPJ: p.cnpj,
      Quantidade: p.quantidade,
      "Data Averbação": formatarData(p.dataAverbacao),
      CRT: p.crt,
      Mercadoria: p.mercadoria,
      Fatura: p.fatura,
      Observação: p.observacao,
      Veículo: p.numeroVeiculo,
      Transporte: p.transporte,
      "Peso Líquido": p.pesoLiquido,
      DUE: p.numeroDue,
      "DUE por": p.responsavelDue,
      "CO por": p.responsavelCo,
      LPCO: p.lpco,
      Fracionado: p.fracionado ? "Sim" : "Não",
      "Aduana Integrada": p.aduanaIntegrada ? "Sim" : "Não",
      Financeiro: p.financeiroCobrou ? "Cobrado" : "Pendente",
      "Data de Lançamento": p.dataLancamento
    };
  });

  const planilha = XLSX.utils.json_to_sheet(dados);
  const arquivo = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(arquivo, planilha, diaSelecionadoExportacao);

  XLSX.writeFile(
    arquivo,
    `processos_exportacao_${diaSelecionadoExportacao.replaceAll("/", "-")}.xlsx`
  );
}

function exportarPDF() {
  if (!diaSelecionadoExportacao) {
    alert("Selecione um dia antes de exportar.");
    return;
  }

  const processosExportar = processos.filter(function(p) {
    return formatarDataLancamentoParaDia(p.dataLancamento) === diaSelecionadoExportacao;
  });

  if (processosExportar.length === 0) {
    alert("Não há processos para exportar neste dia.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("landscape");

  pdf.setFontSize(16);
  pdf.text("Relatório de Processos de Exportação", 14, 15);

  pdf.setFontSize(10);
  pdf.text(`Data do relatório: ${diaSelecionadoExportacao}`, 14, 23);
  pdf.text(`Data de emissão: ${new Date().toLocaleString("pt-BR")}`, 14, 29);
  pdf.text(`Quantidade de registros: ${processosExportar.length}`, 14, 35);

  const corpo = processosExportar.map(function(p) {
    return [
      p.empresa || "",
      p.cnpj || "",
      p.quantidade || "",
      formatarData(p.dataAverbacao),
      p.crt || "",
      p.mercadoria || "",
      p.fatura || "",
      p.numeroDue || "",
      p.numeroVeiculo || "",
      p.transporte || "",
      p.pesoLiquido || "",
      p.fracionado ? "Sim" : "Não",
      p.aduanaIntegrada ? "Sim" : "Não",
      p.financeiroCobrou ? "Cobrado" : "Pendente"
    ];
  });

  pdf.autoTable({
    startY: 42,
    head: [[
      "Empresa",
      "CNPJ",
      "Qtd",
      "Averbação",
      "CRT",
      "Mercadoria",
      "Fatura",
      "DUE",
      "Veículo",
      "Transporte",
      "Peso",
      "Fracionado",
      "Aduana",
      "Financeiro"
    ]],
    body: corpo,
    styles: {
      fontSize: 7
    },
    headStyles: {
      fillColor: [30, 41, 59]
    }
  });

  pdf.save(`processos_exportacao_${diaSelecionadoExportacao.replaceAll("/", "-")}.pdf`);
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

function dataArquivo() {
  const hoje = new Date();

  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = hoje.getFullYear();

  return `${dia}-${mes}-${ano}`;
}

window.renderizarTabela = renderizarTabela;
window.abrirLixeira = abrirLixeira;
window.fecharLixeira = fecharLixeira;
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
await carregarProcessos();
ativarRealtimeProcessos();
await criarBackupAutomatico();

const telaLogin = document.getElementById("telaLogin");
const usuarioLogadoEl = document.getElementById("usuarioLogado");

if (telaLogin) {
  telaLogin.style.display = "none";
}

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
    await carregarProcessos();
    ativarRealtimeProcessos();
    await criarBackupAutomatico();

    if (telaLogin) {
      telaLogin.style.display = "none";
    }

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

  const btnSalvar = document.getElementById("btnSalvar");

  if (!btnSalvar) {
    return;
  }

  if (nivelUsuario === "admin" || nivelUsuario === "operador") {
    btnSalvar.style.display = "inline-block";
  } else {
    btnSalvar.style.display = "none";
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

window.selecionarDiaExportacao = function(dia) {
  diaSelecionadoExportacao = dia;
  alert("Dia selecionado para exportação: " + dia);
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
  console.log("=== BACKUP INICIADO ===");

  const hojeSistema = new Date().toLocaleDateString("pt-BR");
  const hojeBanco = new Date().toISOString().split("T")[0];

  const processosHoje = processos.filter(function(p) {
    return formatarDataLancamentoParaDia(p.dataLancamento) === hojeSistema;
  });

  console.log("Processos hoje:", processosHoje);

  const { data: backupExistente, error: erroBusca } = await banco
    .from("backups")
    .select("id")
    .eq("data_backup", hojeBanco)
    .limit(1);

  if (erroBusca) {
    console.error("Erro ao verificar backup:", erroBusca);
    return;
  }

  if (backupExistente && backupExistente.length > 0) {
    console.log("Backup de hoje já existe.");
    return;
  }

  const { data: backupCriado, error: erroBackup } = await banco
    .from("backups")
    .insert([
      {
        data_backup: hojeBanco,
        total_processos: processosHoje.length,
        dados_json: null
      }
    ])
    .select("id")
    .single();

  if (erroBackup) {
    console.error("Erro ao criar registro de backup:", erroBackup);
    return;
  }

  const backupId = backupCriado.id;

  const dadosBackupProcessos = processosHoje.map(function(p) {
    return {
      backup_id: backupId,
      data_backup: hojeBanco,
      processo_id: p.id,

      empresa: p.empresa || "",
      cnpj: p.cnpj || "",
      quantidade: p.quantidade || null,
      data_averbacao: p.dataAverbacao || null,
      crt: p.crt || "",
      mercadoria: p.mercadoria || "",
      fatura: p.fatura || "",
      observacao: p.observacao || "",
      numero_veiculo: p.numeroVeiculo || "",
      transporte: p.transporte || "",
      peso_liquido: p.pesoLiquido || null,
      numero_due: p.numeroDue || "",
      lpco: p.lpco || "",
      responsavel_due: p.responsavelDue || "",
      responsavel_co: p.responsavelCo || "",
      fracionado: !!p.fracionado,
      aduana_integrada: !!p.aduanaIntegrada,
      financeiro_cobrou: !!p.financeiroCobrou,
      usuario_lancamento: p.usuarioLancamento || usuarioAtual || "",
      data_lancamento: p.dataLancamento || null,
      dia_finalizado: !!p.diaFinalizado
    };
  });

  if (dadosBackupProcessos.length === 0) {
    console.log("Nenhum processo de hoje para gravar no backup detalhado.");
    return;
  }

  const { error: erroDetalhes } = await banco
    .from("backup_processos")
    .insert(dadosBackupProcessos);

  if (erroDetalhes) {
    console.error("Erro ao gravar backup detalhado:", erroDetalhes);
    return;
  }

  console.log("Backup detalhado criado com sucesso:", dadosBackupProcessos.length);
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
