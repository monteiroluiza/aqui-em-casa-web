# Criar casa para uma conta existente

Endpoint autenticado: `POST /api/casas`, com Bearer Token.

Corpo: `{ "nomeCasa": "Minha casa" }`.

Resposta 201: `{ "usuarioId": "uuid", "casaId": "uuid", "membroId": "uuid", "listaId": "uuid", "papel": "ADMINISTRADOR" }`.

O servidor usa a conta do token e cria casa, vínculo de administrador, categorias iniciais e lista de compras. Retorna 409 caso a conta já tenha uma casa ativa.

O frontend direciona contas sem vínculo ativo para `/criar-casa`. Após a criação, seleciona a casa retornada e abre `/inicio`. Em caso de 409, informa que já existe uma casa ativa e oferece acesso ao estoque.

Validação integrada: entrar com uma conta removida, criar uma casa e verificar que o usuário permanece o mesmo, a nova casa é selecionada e o vínculo antigo continua inativo. Uma conta com casa ativa deve entrar diretamente no sistema.
