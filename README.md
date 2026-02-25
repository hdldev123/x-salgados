Sistema de Automação de Pedidos - X Salgados (Frontend)
Este projeto contém o código-fonte do frontend para o sistema de gestão de pedidos da "X Salgados". Ele foi desenvolvido com React.js e tem como objetivo principal fornecer uma interface clara, eficiente e fácil de usar para os funcionários da empresa.

Persona e Objetivo
Este código foi escrito sob a persona de um Engenheiro de Software Frontend Sênior, com o intuito de mentorar uma equipe de 3 desenvolvedores juniores. O foco está em um código limpo, bem-estruturado, componenteizado e com comentários claros em português para facilitar o aprendizado e a manutenção.

Tecnologias Utilizadas
Framework: React.js

Roteamento: React Router DOM

Ícones: React Icons

Gráficos: Recharts

Estilização: CSS puro (com arquivos .css por componente)

Restrições do Projeto: Não foi utilizado TypeScript nem frameworks de CSS como Tailwind CSS, para manter a simplicidade e o foco nos fundamentos.

Instalação e Execução
Siga os passos abaixo para rodar o projeto em seu ambiente de desenvolvimento local.

Pré-requisitos
Node.js (versão 18 ou superior)

npm (geralmente instalado com o Node.js)

1. Clonar o Repositório
git clone <url-do-repositorio>
cd sistema-pedidos-x-salgados

2. Instalar as Dependências
Execute o comando abaixo na raiz do projeto para instalar todas as bibliotecas necessárias listadas no package.json.

npm install

3. Rodar o Projeto
Após a instalação, inicie o servidor de desenvolvimento com o seguinte comando:

npm run dev

A aplicação estará disponível em http://localhost:5173 (ou outra porta, se a 5173 estiver em uso). O servidor de desenvolvimento recarregará automaticamente a página sempre que você salvar uma alteração nos arquivos.

Estrutura de Pastas
O projeto segue uma estrutura de pastas modular e intuitiva:

/src/componentes: Contém componentes React reutilizáveis em toda a aplicação (Ex: Tabela, Modal, Spinner).

/src/contextos: Gerencia o estado global da aplicação, como o contexto de autenticação.

/src/mock: Armazena arquivos JSON com dados simulados para alimentar a aplicação enquanto o backend não está pronto.

/src/paginas: Representa as telas completas do sistema (Ex: Login, Dashboard, ListagemPedidos).

/src/rotas: Define a configuração de todas as rotas da aplicação, incluindo as rotas protegidas.

/src/servicos: Contém a lógica de simulação de chamadas de API, imitando a comunicação com um backend.

Documentação da API
Para guiar o desenvolvimento do backend, foi criado um contrato de API simulado. Este documento detalha todos os endpoints, métodos HTTP e formatos de dados esperados.

Consulte o arquivo CONTRATO_API.md na raiz do projeto.