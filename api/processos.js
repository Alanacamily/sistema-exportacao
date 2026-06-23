const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verificarUsuario(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");

  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

module.exports = async function handler(req, res) {
  const usuario = await verificarUsuario(req);

  if (!usuario) {
    return res.status(401).json({
      error: "Não autorizado"
    });
  }

  if (req.method === "GET") {
    const tipo = req.query.tipo;

    let consulta = supabase
      .from("processos")
      .select("*")
      .eq("excluido", false);

    if (tipo) {
      consulta = consulta.eq("tipo_relatorio", tipo);
    }

    const { data, error } = await consulta;

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({
    error: "Método não permitido"
  });
};
