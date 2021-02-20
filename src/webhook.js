const axios = require('axios');
const dotenv = require('dotenv');
const { type } = require('os');

dotenv.config();

const url_api = process.env.API_URL_FLIGHT;

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



//The information of the flight consulted temporarily persists
let tempPersistence = new Object();

module.exports = {
    async webhook(req, res){
        
        const { queryResult, session } = req.body;
        const { action, outputContexts, parameters } = queryResult;
        
        //Json object response to DialogFlow
        let responseDialogFlow = {};
        
        if( action == 'welcome'){
            //Get up API
            try{
                await axios.get(url_api);
                console.log("GetUp")
            }catch(error){

            }
        
        }else if( action == 'checkin' ){
            try{
                
                const result = await axios.post(url_api+'/checkin',{
                    "flightCode": parameters.flightCode,
                    "nome": parameters.name,
                    "cpf": parameters.cpf
                });

                let textResponse = "Check-in realizado com sucesso! ✅\n\nAnote seu código de check-in: " + result.data[0].checkinCode;
                responseDialogFlow = dialogflow_response(textResponse, session+"/contexts/DefaultWelcomeIntent-followup-2");
            
            }catch(error){
                switch(error.response.status){
                    case 400:
                        responseDialogFlow = dialogflow_response("Infelizmente não encontrei seus dados 😞", session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;

                    default:
                        responseDialogFlow = dialogflow_response("Infelizmente tive um problema ao procurar seus dados 😞", session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;
                }
            }
        }
        else if( action == 'status' ){
            try{
                const result = await axios.post(url_api+'/status',{
                    "flightCode": parameters.flightCode,
                    "cpf": parameters.cpf
                });

                let textResponse = "Check-in realizado com sucesso! ✅\n\nAnote seu código de check-in: " + result.data[0].checkinCode;
                responseDialogFlow = dialogflow_response(textResponse, session+"/contexts/DefaultWelcomeIntent-followup-2");
            
            }catch(error){
                switch(error.response.status){
                    case 400:
                        responseDialogFlow = dialogflow_response("Infelizmente não encontrei seus dados 😞", session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;

                    default:
                        responseDialogFlow = dialogflow_response("Infelizmente tive um problema ao procurar seus dados 😞", session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;
                }
            }
        }
        /*-------------------------------------SEARCH FEATURE--------------------------------------*/
        else if( action == 'yes_roundTrip' || action == 'no_roundTrip' ){
            
            const { parameters } = outputContexts[bigger_context(outputContexts)]

            const data = {
                "whereFrom": parameters.whereFrom.IATA,
                "whereTo": parameters.whereTo.IATA,
                "departureDate": String(parameters.departureDate).slice(0,10),
                "roundTrip": action == 'yes_roundTrip' ? true : false,
                "returnDate": action == 'yes_roundTrip' ? String(parameters.returnDate).slice(0,10) : '',
                "howManyPeople": parameters.howManyPeople
            };
            
            try {
                const result = await axios.post(url_api+'/search', data);
                let textResponse = "Encontramos voo(s) para você! 😄";

                for(let i = 0; i < result.data.length; i++){
                    
                    const flight = result.data[i];
                    
                    let textReturnDate = "";

                    //if it is a round trip, check if you have a seat on the going and return flights
                    if( data.roundTrip ? data.howManyPeople <= flight.freeSeatsGoing.length && data.howManyPeople <= flight.freeSeatsReturn.length : data.howManyPeople <= flight.freeSeatsGoing.length ){
                        
                        textReturnDate = action == 'yes_roundTrip' ? 
                            "\n\nVolta ⬅️" +
                            "\nSaindo de: " + flight.cityTo + " (" + flight.whereTo + ")" +
                            "\nPara: "+ flight.cityFrom + " (" + flight.whereFrom + ")"+
                            "\nEmbarque: " + flight.returnDate.slice(8,10) + "/" + flight.returnDate.slice(5,7) + "/" + flight.returnDate.slice(0,4) + " às " + flight.returnHour
                            : "";

                        textResponse += 
                            "\n\n-------------------VOO Nº "+(i+1)+"--------------------" +
                            "\nCompanhia: " + flight.company +
                            "\n\nIda ➡️\nSaindo de: " + flight.cityFrom + " (" + flight.whereFrom + ")" +
                            "\nPara: "+ flight.cityTo + " (" + flight.whereTo + ")" +
                            "\nEmbarque: " + flight.departureDate.slice(8,10) + "/" + flight.departureDate.slice(5,7) + "/" + flight.departureDate.slice(0,4) + " às " + flight.departureHour +
                            textReturnDate +
                            "\n\nPassageiros: " + flight.howManyPeople +
                            "\nValor total: R$" + flight.price +
                            "\n------------------------------------------------------";

                    }                    
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
                            response = dialogflow_response("Infelizmente não há voos disponíveis para essa data.",session+"/contexts/DefaultWelcomeIntent-followup-2");
                            return res.json(response);
                        }

                        response = dialogflow_response("Desculpe, mas só é permitido até 9 passageiros.",session+"/contexts/DefaultWelcomeIntent-followup-2");

                        break;

                    case 404:
                        response = dialogflow_response("Infelizmente não há voos disponíveis para essa data.",session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;

                    case 500:
                        response = dialogflow_response("Error 500","");
                        break;

                    case 508:
                        response = dialogflow_response("Error 508","");
                        break;

                    default:
                        response = dialogflow_response("Error","");
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

                console.log("Persistence 1")
                console.log(tempPersistence[session])

                return res.json(dialogflow_response(plotSeats, session+"/contexts/DefaultWelcomeIntent-RealizarReseva-followup"));
            }

            responseDialogFlow = dialogflow_response("Poltronas reservadas!", session+"/contexts/DefaultWelcomeIntent-RealizarReseva-followup");

            console.log("Persistence 1")
            console.log(tempPersistence[session])
        }
        return res.json(responseDialogFlow);
    }
}