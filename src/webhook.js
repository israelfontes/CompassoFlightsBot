const axios = require('axios');
const dotenv = require('dotenv');
const brazilian_airports = require('../data/brazilian_airports_citys.json');

dotenv.config();

const url_api = process.env.API_URL_FLIGHT;

function brazilian_airport_IATA(city){
    if( city.indexOf('/') != -1 ){
        return brazilian_airports[city[0,city.indexOf('/')-1]];

    }else if( city.indexOf(',') != -1 ){
        return brazilian_airports[city[0,city.indexOf(',')-1]];

    }else{
        return brazilian_airports[city];
    }
}

/*------This function returns the context that has more parameters-----*/
function bigger_context(contexts){
    
    let biggerIndex = 0;
    let tempLength = 0;
    
    for( let i = 0; i < contexts.length; i++ ){
        if( Object.keys(contexts[i].parameters).length > tempLength ){
            tempLength = Object.keys(contexts[i].parameters).length;
            biggerIndex = i;
        } 
    }

    return biggerIndex;
}
/*----------------------------------------------------------------------*/


/*------This function returns a object Json response to DialogFlow------*/
function dialogflow_response(text, outputContext, param={}){
    return {
        'fulfillmentText':text,
        'output_contexts':[{
            'name':outputContext,
            'lifespanCount': '1',
            'parameters': param
        }]
    }
}
/*----------------------------------------------------------------------*/


/*--------This function returns a plot of free seats in aircraft -------*/
function plot_seats(flight, goingOrReturn='freeSeatsGoing'){

    const freeSeats = flight[goingOrReturn];

    const biggerFreeSeats = parseInt(freeSeats[freeSeats.length-1].slice(0,2));

    //Seat Columns    
    let seatsPlot = (goingOrReturn=='freeSeatsGoing' ? flight.whereFrom : flight.whereTo) + "  ➡️  " + (goingOrReturn=='freeSeatsGoing' ? flight.whereTo : flight.whereFrom) + 
                    "\n\n⠀      A       B      C     |     D       E      F\n";

    const letters = ['A', 'B', 'C','|', 'D', 'E', 'F'];

    for(let line = 1; line <= biggerFreeSeats; line++){
        
        (line%6) ? seatsPlot += '' : seatsPlot += '\n';
        line <= 9 ? seatsPlot += '0' + line + ' ' : seatsPlot += '' + line + ' ';

        for(let column = 1; column <= 7; column++){
            
            let statusSeat = freeSeats.includes('' + line + letters[column-1]) ? '🟢' : '🔴';

            if( column == 7 )
                seatsPlot += '  |'+statusSeat+'|\n';
            
            else if( column == 4 )
                seatsPlot += '  --';
            
            else
                seatsPlot += '  |'+statusSeat+'|';
        }
    }

    seatsPlot += '\n\n🔴 - Poltrona ocupada\n🟢 - Poltrona disponível'+
                    '\n\nQuais poltronas no voo de'+(goingOrReturn=='freeSeatsGoing' ? ' IDA ': ' VOLTA ') +'você quer reservar?' +
                    '\nEx.: 01B, 09C e 14A';
   
    return seatsPlot;
}
/*----------------------------------------------------------------------*/

/*---------------This function returns a plot flight infos -------------*/
function plot_flight(flight, roundTrip){
    let textReturnDate = 
        roundTrip ? "\n\nVolta ⬅️" +
                    "\nSaindo de: " + flight.cityTo + " (" + flight.whereTo + ")" +
                    "\nPara: "+ flight.cityFrom + " (" + flight.whereFrom + ")"+
                    "\nEmbarque: " + flight.returnDate.slice(8,10) + "/" + flight.returnDate.slice(5,7) + "/" + flight.returnDate.slice(0,4) + " às " + flight.returnHour
                    : "";

    let textResponse = 
        "\nCompanhia: " + flight.company +
        "\n\nIda ➡️\nSaindo de: " + flight.cityFrom + " (" + flight.whereFrom + ")" +
        "\nPara: "+ flight.cityTo + " (" + flight.whereTo + ")" +
        "\nEmbarque: " + flight.departureDate.slice(8,10) + "/" + flight.departureDate.slice(5,7) + "/" + flight.departureDate.slice(0,4) + " às " + flight.departureHour +
        textReturnDate;
    
    textResponse += flight.howManyPeople != undefined ? "\n\nPassageiros: " + flight.howManyPeople :'\n';
    textResponse += "\nValor total: R$" + flight.price;
    
    return textResponse;
}
/*----------------------------------------------------------------------*/


//The information of the flight consulted temporarily persists
let tempPersistence = new Object();
let peopleSequence = ['', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo', 'nono'];

module.exports = {
    async webhook(req, res){
        
        const { queryResult, session } = req.body;
        const { action, outputContexts, parameters } = queryResult;
        
        //Json object response to DialogFlow
        let responseDialogFlow = {};

        /*-------------------------------------WELCOME FEATURE--------------------------------------*/
        if( action == 'welcome'){
            //Get up API
            try{
                await axios.get(url_api);
                console.log("GetUp");

            //Case API is not responding, return error
            }catch(error){
                return res.json(dialogflow_response("Desculpe, mas estou fora do ar no momento 😣",session+"/contexts/DefaultWelcomeIntent-followup-2"));
            }
        /*--------------------------------------------------------------------------------------------*/
        

        /*--------------------------------------CHECK-IN FEATURE--------------------------------------*/
        }else if( action == 'checkin' ){
            let ob = {
                "flightCode": parameters.flightCode,
                "name": parameters.name.name,
                "cpf": parameters.cpf
            }

            try{
                const result = await axios.post(url_api+'/checkin',ob);                
                let textResponse = "Check-in realizado com sucesso! ✅\n\nAnote seu código de check-in: " + result.data.checkinCode;
                responseDialogFlow = dialogflow_response(textResponse, session+"/contexts/DefaultWelcomeIntent-followup-2");
            
            }catch(error){
                switch(error.response.status){
                    
                    case 400:
                        let text = "";
                        
                        switch(error.response.data.message){
                            case "flightCode não encontrado":
                                text = "Não consegui encontrar o número do seu voo.\nVerifique se ele está certinho e tente novamente 😉";
                                break;
                            case "Check-in já realizado anteriormente":
                                text = "Você havia já realizado o check-in anteriormente 😉";
                                break;
                            case "Nenhum passageiro foi encontrado com este CPF":
                                text = "Não consegui encontrar seu CPF 😞\nVerique se você o inseriu corretamente e tente novamente."
                                break;
                            default:
                        }

                        responseDialogFlow = dialogflow_response(text, session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;

                    default:
                        responseDialogFlow = dialogflow_response("Infelizmente tive um problema ao procurar seus dados 😞", session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;
                }
            }
        }
        /*--------------------------------------------------------------------------------------------*/



        /*---------------------------------------STATUS FEATURE---------------------------------------*/
        else if( action == 'status' ){
            try{
                const result = await axios.post(url_api+'/status',{
                    "flightCode": parameters.flightCode,
                    "cpf": parameters.cpf
                });

                let textResponse = "Estão aqui os dados do seu voo 🛫\n" + plot_flight(result.data, result.data.roundTrip);
                textResponse += "\n\nPosso te com algo mais?";

                responseDialogFlow = dialogflow_response(textResponse, session+"/contexts/DefaultWelcomeIntent-followup-2");

            }catch(error){
 
                switch(error.response.status){
                    
                    case 400:
    
                        let text = '';
                        switch( error.response.data.message ){
                            case "flightCode não encontrado":
                                text = "Infelizmente não encontrei o número do seu voo 😞\n\nPosso te ajudar com outra coisa?";
                                break;
                            case "Nenhum passageiro foi encontrado com este CPF":
                                text = "Desculpa, mas o CPF informado não consta neste voo.\n\nTe ajudo com mais alguma coisa?";
                                break;
                            default:
                                text = "Infelizmente não encontrei seus dados 😞\n\nPosso te ajudar com outra coisa?";
                                break;
                        }
                        responseDialogFlow = dialogflow_response(text, session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;
                    default:
                        responseDialogFlow = dialogflow_response("Infelizmente tive um problema ao procurar seus dados 😞\n\nTe ajudo com algo mais?", session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;
                }
            }
        }
        /*--------------------------------------------------------------------------------------------*/



        /*---------------------------------------SEARCH FEATURE---------------------------------------*/
        else if( action == 'yes_roundTrip' || action == 'no_roundTrip' ){
            
            const { parameters } = outputContexts[bigger_context(outputContexts)]
             console.log(parameters.whereFrom)
           
             if( brazilian_airport_IATA(parameters.whereFrom) == undefined )
                return res.json(dialogflow_response("Desculpe, mas não consegui encontrar nenhum aeroporto na cidade de partidade.\n\nTente novamente informando uma outra cidade 😉",session+"/contexts/DefaultWelcomeIntent-followup-2"));
            else if( brazilian_airport_IATA(parameters.whereTo) == undefined )
                return res.json(dialogflow_response("Desculpe, mas não encontrei nenhum aeroporto na cidade de destino.\n\nTente novamente informando um outro destino 😉",session+"/contexts/DefaultWelcomeIntent-followup-2"));
            

            const data = {
                "whereFrom": brazilian_airport_IATA(parameters.whereFrom),
                "whereTo": brazilian_airport_IATA(parameters.whereTo),
                "departureDate": String(parameters.departureDate).slice(0,10),
                "roundTrip": action == 'yes_roundTrip',
                "returnDate": action == 'yes_roundTrip' ? String(parameters.returnDate).slice(0,10) : '',
                "howManyPeople": parameters.howManyPeople
            };
            
            try {
                const result = await axios.post(url_api+'/search', data);
                let textResponse = "Encontramos voo(s) para você! 😄";
                let isExistFlight = false;

                for(let i = 0; i < result.data.length; i++){
                    console.log('for')
                    const flight = result.data[i];
                    
                    //if it is a round trip, check if you have a seat on the going and return flights
                    if( data.roundTrip ? data.howManyPeople <= flight.freeSeatsGoing.length && data.howManyPeople <= flight.freeSeatsReturn.length : data.howManyPeople <= flight.freeSeatsGoing.length ){
                        isExistFlight = true;
                        textResponse += 
                            "\n\n-------------------VOO Nº "+(i+1)+"--------------------" +
                            plot_flight( flight, action == 'yes_roundTrip' ) +
                            "\n------------------------------------------------------";
                    }                    
                }

                //if is not exist flights with howManyPeoples, returns error
                if( !isExistFlight ){
                    response = dialogflow_response("Infelizmente não há voos disponíveis para " +data.howManyPeople+ " pessoas nessa data.",session+"/contexts/DefaultWelcomeIntent-followup-2");
                    return res.json(response);
                }

                textResponse += "\n\nDeseja fazer uma reserva?";

                tempPersistence[session] = result.data;
                
                console.log(result.data)

                responseDialogFlow = dialogflow_response(textResponse,session+"/contexts/realizar-reserva");

            }catch(error){
                console.log(error.response.status)                
                switch(error.response.status){
                    case 400:
                        
                        if(error.response.data.message == "Envie um departureDate que seja uma data após o dia de hoje"){
                            responseDialogFlow = dialogflow_response("Infelizmente não há voos disponíveis para essa data.",session+"/contexts/DefaultWelcomeIntent-followup-2");
                            return res.json(responseDialogFlow);
                        }
                        responseDialogFlow = dialogflow_response("Desculpe, mas só é permitido até 9 passageiros.",session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;

                    case 404:
                        responseDialogFlow = dialogflow_response("Infelizmente não há voos disponíveis para essa data.\n\n",session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;

                    case 500:
                        responseDialogFlow = dialogflow_response("Error 500","");
                        break;

                    case 508:
                        responseDialogFlow = dialogflow_response("Error 508","");
                        break;

                    default:
                        responseDialogFlow = dialogflow_response("Error","");
                }

                console.log(error.message)
                console.log(error.response.data.message)                    
            }   
        /*-------------------------------------------------------------------------------------------------------------*/
        


        /*------------------------------------------FREE SEAT PLOT FEATURE---------------------------------------------*/
        }else if( action == 'free-seat' ){
            const flightNumber = parameters.flightNumber;
            
            //if flight number inputed is not valid, return error
            if( !(flightNumber > 0 && flightNumber <= tempPersistence[session].length) )
                return res.json(dialogflow_response("Por favor, digite um número de voo válido.", session+"/contexts/realizar-reserva"));

            const flight = tempPersistence[session][flightNumber-1];
            
            tempPersistence[session] = flight;
            tempPersistence[session]['isReturnQuestion'] = false;

            let seatsPlot = plot_seats(flight);

            responseDialogFlow = dialogflow_response(seatsPlot, session+"/contexts/DefaultWelcomeIntent-RealizarReseva-followup");
            console.log(seatsPlot);
        /*-------------------------------------------------------------------------------------------------------------*/
        
        
        /*--------------------------------------------FREE SEATS FEATURE-----------------------------------------------*/
        }else if( action == 'freeSeats' ){
            
            const freeSeats = tempPersistence[session]['isReturnQuestion'] ? 'freeSeatsReturn' : 'freeSeatsGoing';
            const flight = tempPersistence[session];
            const listSeats = parameters.listSeats;

            //if seats input is different than howManyPeople, return error
            if( tempPersistence[session].howManyPeople != listSeats.length )
                return res.json(dialogflow_response("Você precisa me informar todas as "+ tempPersistence[session].howManyPeople + " poltronas.", session+"/contexts/DefaultWelcomeIntent-RealizarReseva-followup"));

            
            //if seats input is 01B, to remove 0. Return 1B
            for(let i = 0; i < listSeats.length; i++)
                listSeats[i] = listSeats[i].slice(0,1) == '0' ? listSeats[i].slice(1) : listSeats[i];
            
            for(let i = 0; i < listSeats.length; i++){

                //if seats input is available
                if( !flight[freeSeats].includes(listSeats[i]) ){
                    return res.json(dialogflow_response("A poltrona "+ listSeats[i] + " não está disponível. Por favor, escolha apenas poltronas disponíveis.", session+"/contexts/DefaultWelcomeIntent-RealizarReseva-followup"));
                }
            }
            
            //if flight is round trip, choose the seats for the return
            if( tempPersistence[session].roundTrip && !tempPersistence[session]['isReturnQuestion'] ){
                
                const plotSeats = plot_seats(flight, "freeSeatsReturn");
                tempPersistence[session]['isReturnQuestion'] = true;

                //Save selected list seats going
                tempPersistence[session]['selectedSeatsGoing'] = listSeats;

                console.log(tempPersistence[session])

                return res.json(dialogflow_response(plotSeats, session+"/contexts/DefaultWelcomeIntent-RealizarReseva-followup"));
            }

            //Save selected list seats going or return
            if( tempPersistence[session]['isReturnQuestion'] ){
                tempPersistence[session]['selectedSeatsReturn'] = listSeats;
            }else{
                tempPersistence[session]['selectedSeatsGoing'] = listSeats;
            }

            //Declare passengers
            tempPersistence[session]['passengers'] = []

            let text = tempPersistence[session].howManyPeople == 1 ? "Pronto!\nAgora irei precisar dos dados do passageiro para finalizar a reserva. Qual é o completo?":
                "Pronto!\nAgora irei precisar dos dados dos passageiros para finalizar a reserva. Qual é o completo do primeiro passageiro?";

            responseDialogFlow = dialogflow_response(text, session+"/contexts/DefaultWelcomeIntent-RealizarReseva-Poltronas-followup");
            tempPersistence[session]['howManyPeopleisQuestion'] = 1;
            
            console.log(tempPersistence[session])
        }
        /*-------------------------------------------------------------------------------------------------------------*/
        


        /*----------------------------------------------PASSAGER FEATURE-----------------------------------------------*/
        else if( action == 'passenger' ){
            
            let flight = tempPersistence[session]

            let passenger = new Object({
                name: parameters.name.name,
                cpf: parameters.cpf,
                birthDate: String(parameters.birthDate).slice(0,10),
                phone: parameters.phone,
                seatGoing: flight.selectedSeatsGoing[flight.howManyPeopleisQuestion-1],
                seatReturn: flight.roundTrip ? flight.selectedSeatsReturn[flight.howManyPeopleisQuestion-1] : null
            });

            tempPersistence[session].passengers.push(passenger);

            if( flight.howManyPeopleisQuestion < flight.howManyPeople ){
                
                tempPersistence[session].howManyPeopleisQuestion++;
                
                responseDialogFlow = dialogflow_response('Agora vamos para o ' + peopleSequence[flight.howManyPeopleisQuestion] + ' passageiro.\nQual é o nome completo dele(a)?', 
                session+'/contexts/DefaultWelcomeIntent-RealizarReseva-Poltronas-followup');
            
            }else{
                delete tempPersistence[session].howManyPeopleisQuestion;
                delete tempPersistence[session].isReturnQuestion;
                delete tempPersistence[session].selectedSeatsReturn;
                delete tempPersistence[session].selectedSeatsGoing;
                delete tempPersistence[session].freeSeatsReturn;
                delete tempPersistence[session].freeSeatsGoing;
                console.log(tempPersistence[session]);

                try{
                    let result = await axios.post(url_api+'/reservation', tempPersistence[session]);
                    console.log(result.data.flightCode);
                    console.log(tempPersistence[session]);
                    responseDialogFlow = dialogflow_response("Reserva feita com sucesso! ✅\nEsse é o código do voo: "+result.data.flightCode, session+"/contexts/DefaultWelcomeIntent-followup-2");
            
                }catch(error){
                    console.log(error.response.data.message)
                }
            }
        }
        /*-------------------------------------------------------------------------------------------------------------*/
        
        return res.json(responseDialogFlow);
    }
}