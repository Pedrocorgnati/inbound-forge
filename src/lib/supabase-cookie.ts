// Nome de cookie de auth especifico do app.
//
// Por padrao o @supabase/ssr deriva o nome do cookie do host da URL do Supabase
// (ex.: http://127.0.0.1:54421 -> "sb-127-auth-token"). Em dev local, varios
// projetos Supabase compartilham o host 127.0.0.1/localhost e colidem nesse
// mesmo nome de cookie no dominio "localhost", embaralhando sessoes entre apps.
//
// Fixar um nome unico isola a sessao deste app de qualquer outro stack Supabase
// local rodando na mesma maquina.
export const SUPABASE_AUTH_COOKIE_NAME = 'sb-inbound-forge-auth-token'
