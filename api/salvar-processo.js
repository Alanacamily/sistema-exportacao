const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verificarUsuario(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");

  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

async function verificarPermissao(email) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("nivel")
    .ilike("email", email)
    .limit(1);

  if (error || !data || data.length === 0) return false;

  return data[0].nivel === "admin" || data[0].nivel === "operador";
}

module.exports = async function handler(req, res) {
  try {
    const usuario = await verificarUsuario(req);

    if (!usuario) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const permitido = await verificarPermissao(usuario.email);

    if (!permitido) {
      return res.status(403).json({ error: "Sem permissão" });
    }

    const { processo, id } = req.body;

    if (req.method === "POST") {
      const { data, error } = await supabase
        .from("processos")
        .insert([processo])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json(data);
    }

    if (req.method === "PUT") {
      const { data, error } = await supabase
        .from("processos")
        .update(processo)
        .eq("id", id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (erro) {
    return res.status(500).json({ error: erro.message });
  }
};
