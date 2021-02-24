<div align='center'>

<a href='https://github.com/israelfontes/CompassoFlightsBot'>
    <img align='center' width='30%' src='img/logo.png'/>
</a>
    <h2 align='center'>Compasso Flights</h2>
    <p>Seu assistente de voos ✈️</p>
</div>

### Overview

<a href='https://t.me/CompassoFlights_bot'>Compasso Flights</a> é um 🤖 (bot) que te auxilia na busca de passagens aéreas, a fazer reserva de passagem, realizar check-in de voo e verificar o status do voo. 

### Diagram
<div align='center'>

<a href='https://github.com/israelfontes/CompassoFlightsBot'>
    <img align='center' width='100%' src='img/diagram.png'/>
</a>
    <h2 align='center'>Compasso Flights</h2>
    <p>Seu assistente de voos ✈️</p>
</div>

### ToDo
- [x] <b>Integrar bot no Telegram com o DialogFlow</b>
- [x] <b>Criar intenções básicas</b> <i>(Welcome, About me)</i>
- [x] <b>Intenção Status de Voo</b>
- [x] <b>Intenção Check-in</b>
- [X] <b>Intenção de Consulta de voos</b> 
- [ ] <b>Intenção de Reserva de voo</b><br>
    <b>Problema:</b><i>como buscar por aeroportos pelo nome da cidade?</i><br>
    <blockquote>Utilizando uma lista feita a mão de todos os aeroportos do Brasil com nome da cidade e código IATA.
    </blockquote><br>
    <b>Problema:</b> <i>como mostrar as vagas disponíveis no voo de forma intuitiva? </i>
    <div align='center'><br>
        <a href='https://github.com/israelfontes/CompassoFlightsBot'>
            <img align='center' width='150px' src='img/plot_seats.jpg'/>
        </a>
        <a href='https://github.com/israelfontes/CompassoFlightsBot'>
            <img align='center' width='150px' src='img/plot_seats_2.jpg'/>
        </a>
    </div><br>
    <blockquote> Esse foi um dos grandes problemas desse projeto, os usuários não tinham uma boa noção das poltronas vazias da aeronave para que pudessem realizar sua escolha no momento da reserva. Utilizando essa abordagem é possível oferecer ao cliente uma minima visualização dos assentos livres e ocupados, para que ele escolha os mais adequados.</blockquote>
    <br>
    <b>Problema:</b> <i>como receber os dados de mais de um passageiro?</i> <br>
    <blockquote>Criando uma intenção recorrente que solicita as informações necessárias para a reserva de cada uma das pessoas de acordo com a quantidade de passageiros informadas durante a reserva.</blockquote>


### Tecnologias

- <a href='https://dialogflow.cloud.google.com/'>
    <img align='center' width='25px' src='https://res-3.cloudinary.com/crunchbase-production/image/upload/c_lpad,h_256,w_256,f_auto,q_auto:eco/dcph7ykbnygzl7i5hmft'>DialogFlow</img>
</a>

- <a href='https://nodejs.org/'>
    <img align='center' width='25px' src='https://nodejs.org/static/images/logo-hexagon-card.png'>NodeJS</img>
</a>

- <a href='https://t.me/CompassoFlights_bot'>
    <img align='center' width='25px' src='https://logodownload.org/wp-content/uploads/2017/11/telegram-logo-3.png'>Telegram</img>
</a>

- <a href='https://t.me/CompassoFlights_bot'>
    <img align='center' width='25px' src='https://image.flaticon.com/icons/png/512/873/873120.png'>Heroku</img>
</a>
