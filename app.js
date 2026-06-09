console.log("APP.JS CARREGOU");

const SUPABASE_URL = "https://ayekrvnqjtmpvjtrwqnd.supabase.co";
const SUPABASE_KEY = "sb_publishable_e9EC0WSIoq3ISWipVj1TTA_a_ZG1Bz0";

const banco = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase conectado:", banco);

let processos = JSON.parse(localStorage.getItem("processos")) || [];
let lixeira = JSON.parse(localStorage.getItem("lixeira")) || [];
let editandoIndex = null;

function salvarLocal() {
  localStorage.setItem("processos", JSON.stringify(processos));
  localStorage.setItem("lixeira", JSON.stringify(lixeira));
}

function valor(id) {
  return document.getElementById(id).value;
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
    financeiro_cobrou: false,
    usuario_lancamento: "Alana"
  };

  try {
    const { error } = await banco
      .from("processos")
      .insert([processo]);

    if (error) {
      console.error("Erro Supabase:", error);
      alert("Erro ao salvar no Supabase.");
      return;
    }

    alert("Processo salvo com sucesso!");

    limparFormulario();

  } catch (erro) {
    console.error("Falha geral:", erro);
    alert("Falha ao conectar com o banco.");
  }
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

function renderizarTabela() {
  const tbody = document.getElementById("tabelaProcessos");
  const busca = document.getElementById("busca").value.toLowerCase();
  const filtroData = document.getElementById("filtroData").value;

  tbody.innerHTML = "";

  processos.forEach(function(p, index) {
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

    if (!passaBusca || !passaData) {
      return;
    }
     if (p.fracionado) {
     renderizarFracionado(tbody, p, index);
      return;
     }

     if (p.aduanaIntegrada) {
     renderizarAduanaIntegrada(tbody, p, index);
     return;
     }
    const tr = document.createElement("tr");

    if (p.financeiroCobrou) {
      tr.classList.add("cobrado");
    }
function renderizarFracionado(tbody, p, index) {
  const linhaTitulo = document.createElement("tr");

  linhaTitulo.innerHTML = `
    <td colspan="19" class="linha-fracionado">
      FRACIONADO
    </td>
  `;

  tbody.appendChild(linhaTitulo);

  const tr = document.createElement("tr");

  if (p.financeiroCobrou) {
    tr.classList.add("cobrado");
  }

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
    <td>${p.numeroDue || ""}</td>

   <td>
   ${p.responsavelDue === "Parceiro" ? "Parceiro" : "-"}
   </td>

   <td>
    ${p.responsavelCo === "Parceiro" ? "Parceiro" : "-"}
   </td>

   <td>${p.lpco || "-"}</td>

   <td>
   ${p.fracionado ? "📦 Fracionado" : ""}
   ${p.aduanaIntegrada ? "🛃 Aduana Integrada" : ""}
  </td>

      <button 
        class="${p.financeiroCobrou ? "btn-financeiro-ok" : "btn-financeiro"}"
        onclick="alternarFinanceiro(${index})">
        ${p.financeiroCobrou ? "🟢 Cobrado" : "⚪ Cobrar"}
      </button>
    </td>
    <td>${p.dataLancamento}</td>
    <td>
      <button class="btn-edit" onclick="editarProcesso(${index})">Editar</button>
      <button class="btn-delete" onclick="excluirProcesso(${index})">Excluir</button>
    </td>
  `;

  tbody.appendChild(tr);
}

function renderizarAduanaIntegrada(tbody, p, index) {
  const tr = document.createElement("tr");

  if (p.financeiroCobrou) {
    tr.classList.add("cobrado");
  }

  tr.innerHTML = `
    <td>${p.empresa || ""}</td>
    <td>${p.cnpj || ""}</td>
    <td colspan="8" class="linha-aduana">
      🛃 ADUANA INTEGRADA
    </td>
    <td>${p.pesoLiquido || ""}</td>
    <td colspan="5"></td>
    <td>
      <button 
        class="${p.financeiroCobrou ? "btn-financeiro-ok" : "btn-financeiro"}"
        onclick="alternarFinanceiro(${index})">
        ${p.financeiroCobrou ? "🟢 Cobrado" : "⚪ Cobrar"}
      </button>
    </td>
    <td>${p.dataLancamento}</td>
    <td>
      <button class="btn-edit" onclick="editarProcesso(${index})">Editar</button>
      <button class="btn-delete" onclick="excluirProcesso(${index})">Excluir</button>
    </td>
  `;

  tbody.appendChild(tr);
}
    tr.innerHTML = `
      <td>${p.empresa}</td>
      <td>${p.quantidade || ""}</td>
      <td>${formatarData(p.dataAverbacao)}</td>
      <td>${p.crt || ""}</td>
      <td>${p.mercadoria || ""}</td>
      <td>${p.fatura}</td>
      <td>${p.observacao || ""}</td>
      <td>${p.numeroVeiculo || ""}</td>
      <td>${p.transporte || ""}</td>
      <td>${p.pesoLiquido || ""}</td>
      <td>${p.numeroDue || ""}</td>
      <td>${p.numeroDue || ""}</td>
      <td>
     ${p.responsavelDue === "Exacta" ? "Exacta" : "-"}
      </td>

      <td>
     ${p.responsavelDue === "Parceiro" ? "Parceiro" : "-"}
     </td>

      <td>
     ${p.responsavelCo === "Exacta" ? "Exacta" : "-"}
     </td>

      <td>
     ${p.responsavelCo === "Parceiro" ? "Parceiro" : "-"}
     </td>

      <td>${p.lpco || "-"}</td>
      <td>
       ${p.fracionado ? "📦 Fracionado" : ""}
       ${p.aduanaIntegrada ? "🛃 Aduana Integrada" : ""}
       </td>

        <button 
          class="${p.financeiroCobrou ? "btn-financeiro-ok" : "btn-financeiro"}"
          onclick="alternarFinanceiro(${index})">
          ${p.financeiroCobrou ? "🟢 Cobrado" : "⚪ Cobrar"}
        </button>
      </td>
      <td>${p.dataLancamento}</td>
      <td>
        <button class="btn-edit" onclick="editarProcesso(${index})">Editar</button>
        <button class="btn-delete" onclick="excluirProcesso(${index})">Excluir</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  atualizarDashboard();
}

function editarProcesso(index) {
  const p = processos[index];

  if (document.getElementById("cnpj")) {
  document.getElementById("cnpj").value = p.cnpj || "";
}
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

  document.querySelector(
    `input[name="due"][value="${p.responsavelDue || "Exacta"}"]`
  ).checked = true;

  document.querySelector(
    `input[name="co"][value="${p.responsavelCo || "Exacta"}"]`
  ).checked = true;

  editandoIndex = index;
  document.getElementById("btnSalvar").innerText = "Atualizar Processo";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function excluirProcesso(index) {
  if (!confirm("Deseja mover este processo para a lixeira?")) {
    return;
  }

  const removido = processos.splice(index, 1)[0];
  removido.dataExclusao = new Date().toLocaleString("pt-BR");

  lixeira.push(removido);

  salvarLocal();
  renderizarTabela();
  renderizarLixeira();
}

function abrirLixeira() {
  document.getElementById("modalLixeira").style.display = "flex";
  renderizarLixeira();
}

function fecharLixeira() {
  document.getElementById("modalLixeira").style.display = "none";
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
      <p><strong>Fatura:</strong> ${p.fatura}</p>
      <p><strong>DUE:</strong> ${p.numeroDue || ""}</p>
      <p><strong>Aduana Integrada:</strong> ${p.aduanaIntegrada ? "Sim" : "Não"}</p>
      <p><strong>Excluído em:</strong> ${p.dataExclusao}</p>

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

function restaurarProcesso(index) {
  const restaurado = lixeira.splice(index, 1)[0];

  delete restaurado.dataExclusao;

  processos.push(restaurado);

  salvarLocal();
  renderizarTabela();
  renderizarLixeira();
}

function excluirDefinitivo(index) {
  if (!confirm("Excluir definitivamente? Essa ação não poderá ser desfeita.")) {
    return;
  }

  lixeira.splice(index, 1);

  salvarLocal();
  renderizarLixeira();
}

function alternarFinanceiro(index) {
  processos[index].financeiroCobrou = !processos[index].financeiroCobrou;

  salvarLocal();
  renderizarTabela();
}

function atualizarDashboard() {
  const total = processos.length;
  const cobrados = processos.filter(function(p) {
    return p.financeiroCobrou;
  }).length;

  const pendentes = total - cobrados;

  document.getElementById("totalProcessos").innerText = total;
  document.getElementById("totalCobrados").innerText = cobrados;
  document.getElementById("totalPendentes").innerText = pendentes;
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
  const dados = dadosFiltrados().map(function(p) {
    return {
      Empresa: p.empresa,
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

  XLSX.utils.book_append_sheet(arquivo, planilha, "Processos");
  XLSX.writeFile(arquivo, `processos_exportacao_${dataArquivo()}.xlsx`);
}

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("landscape");

  const dados = dadosFiltrados();

  pdf.setFontSize(16);
  pdf.text("Relatório de Processos de Exportação", 14, 15);

  pdf.setFontSize(10);
  pdf.text(`Data de emissão: ${new Date().toLocaleString("pt-BR")}`, 14, 23);
  pdf.text(`Quantidade de registros: ${dados.length}`, 14, 29);

  const corpo = dados.map(function(p) {
    return [
      p.empresa,
      p.quantidade || "",
      formatarData(p.dataAverbacao),
      p.crt || "",
      p.fatura,
      p.numeroDue || "",
      p.numeroVeiculo || "",
      p.transporte || "",
      p.pesoLiquido || "",
      p.fracionado ? "Sim" : "Não",
      p.aduanaIntegrada ? "Sim" : "Não",
      p.financeiroCobrou ? "Cobrado" : "Pendente",
      p.dataLancamento
    ];
  });

  pdf.autoTable({
    startY: 35,
    head: [[
      "Empresa",
      "Qtd",
      "Averbação",
      "CRT",
      "Fatura",
      "DUE",
      "Veículo",
      "Transporte",
      "Peso",
      "Fracionado",
      "Aduana",
      "Financeiro",
      "Lançamento"
    ]],
    body: corpo,
    styles: {
      fontSize: 7
    },
    headStyles: {
      fillColor: [30, 41, 59]
    }
  });

  pdf.save(`processos_exportacao_${dataArquivo()}.pdf`);
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

renderizarTabela();
renderizarLixeira();

window.salvarProcesso = salvarProcesso;
window.renderizarTabela = renderizarTabela;
window.abrirLixeira = abrirLixeira;
window.fecharLixeira = fecharLixeira;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;
