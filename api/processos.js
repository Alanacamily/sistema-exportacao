const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { data, error } = await supabase
      .from("processos")
      .select("*")
      .eq("excluido", false);

    if (error) {
      return res.status(500).json(error);
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};
