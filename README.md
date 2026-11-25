# Aqui em Casa — frontend

Angular 21. Telas de login e cadastro baseadas no protótipo, com integração à API Spring Boot.

## Executar

Com o backend na porta 8080, execute `npm start` e abra http://localhost:4200.
O arquivo `proxy.conf.json` encaminha `/api/**` para http://localhost:8080; ajuste o destino se necessário.
Em produção, configure o servidor para encaminhar `/api/**` ao backend e as rotas Angular ao `index.html`. O proxy do Angular serve apenas ao desenvolvimento.

## Autenticação

- Login: `POST /api/auth/login` com `email` e `senha`.
- Cadastro: `POST /api/cadastros/nova-casa` com `nome`, `email`, `senha` e `nomeCasa`.
- Convite: `POST /api/convites/aceitar` com `nome`, `email`, `senha` e `codigo`.
- Após cadastro ou aceite, o frontend faz login automaticamente.
- O token opaco Bearer fica no sessionStorage da aba, com validade baseada em `expiresIn`. Nenhuma senha é persistida.
- O guard de `/inicio` valida a sessão em `GET /api/auth/sessao`. Respostas 401 encerram a sessão local.
- A tela inicial consulta as casas em `GET /api/casas`. Sair revoga o token com `POST /api/auth/logout` e limpa a sessão local mesmo se o servidor estiver indisponível.
- O interceptor envia Authorization somente às chamadas protegidas de `/api/`.

## Limites atuais

A API ainda não oferece recuperação de senha nem a opção de estoque de exemplo. A interface informa essa indisponibilidade. O código de convite deve ser real; o exemplo CASA-482 do protótipo não é utilizado.
O cadastro de nova casa pede ao menos 4 caracteres na interface; por convite, o contrato do backend exige de 8 a 128 caracteres.
A tela `/inicio` é uma página inicial mínima com as casas do usuário; as demais telas do sistema ainda serão implementadas.

## Verificação

`npm run build` gera a versão de produção. `npm test -- --watch=false` executa os testes.
