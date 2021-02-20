const axios = require('axios');
const dotenv = require('dotenv');
const { type } = require('os');

dotenv.config();

const api_url = process.env.API_URL_FLIGHT;

/*------This function returns the context that has more parameters-----*/
function biggerContext(contexts){
    
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
function dialogflowResponse(text, outputContext){
    return {
        'fulfillmentText':text,
        'output_contexts':[{
            'name':outputContext,
            'lifespanCount': '1',
        }]
    }
}
/*----------------------------------------------------------------------*/


//The information of the flight consulted temporarily persists
let tempPersistence = new Object();

module.exports = {
    async webhook(req, res){
        
        const { queryResult, session } = req.body;
        const { action, outputContexts } = queryResult;
        
        //Json object response to DialogFlow
        let response = {};
        
        /*-------------------------------------SEARCH FEATURE--------------------------------------*/
        if( action == 'yes_roundTrip' || action == 'no_roundTrip' ){
            
            const { parameters } = outputContexts[biggerContext(outputContexts)]

            const data = {
                "whereFrom": parameters.whereFrom.IATA,
                "whereTo": parameters.whereTo.IATA,
                "departureDate": String(parameters.departureDate).slice(0,10),
                "roundTrip": action == 'yes_roundTrip' ? true : false,
                "returnDate": action == 'yes_roundTrip' ? String(parameters.returnDate).slice(0,10) : '',
                "howManyPeople": parameters.howManyPeople
            };
            
            try {
                const result = await axios.post(api_url+'/search', data);
                tempPersistence[session] = result.data[0];
                
                const flight = result.data[0]

                console.log(result.data)

                let textReturnDate = action == 'yes_roundTrip' ? 
                    "\n\nVolta ⬅️" +
                    "\nSaindo de: " + flight.cityTo + " (" + flight.whereTo + ")" +
                    "\nPara: "+ flight.cityFrom + " (" + flight.whereFrom + ")"+
                    "\nEmbarque: " + flight.returnDate.slice(8,10) + "/" + flight.returnDate.slice(5,7) + "/" + flight.returnDate.slice(0,4) + " às " + flight.returnHour
                    : "";

                let textResponse = 
                    "Encontramos um voo! 😄 "+
                    "\n\nCompanhia: " + flight.company +
                    "\n\nIda ➡️\nSaindo de: " + flight.cityFrom + " (" + flight.whereFrom + ")" +
                    "\nPara: "+ flight.cityTo + " (" + flight.whereTo + ")" +
                    "\nEmbarque: " + flight.departureDate.slice(8,10) + "/" + flight.departureDate.slice(5,7) + "/" + flight.departureDate.slice(0,4) + " às " + flight.departureHour +
                    textReturnDate +
                    "\n\nPassageiros: " + flight.howManyPeople +
                    "\nValor total: R$" + flight.price +
                    "\n\nDeseja fazer a reserva?";

                response = dialogflowResponse(textResponse,session+"/contexts/realizar-reserva");

            }catch(error){
                console.log("error "+error.response.status)
                
                switch(error.response.status){
                    case 400:
                        
                        if(error.response.data.message == "Envie um departureDate que seja uma data após o dia de hoje"){
                            response = dialogflowResponse("Infelizmente não há voos disponíveis para essa data.",session+"/contexts/DefaultWelcomeIntent-followup-2");
                            return res.json(response);
                        }

                        response = dialogflowResponse("Desculpe, mas só é permitido até 9 passageiros.",session+"/contexts/DefaultWelcomeIntent-followup-2");

                        break;

                    case 404:
                        response = dialogflowResponse("Infelizmente não há voos disponíveis para essa data.",session+"/contexts/DefaultWelcomeIntent-followup-2");
                        break;

                    case 500:
                        response = dialogflowResponse("Error 500","");
                        break;

                    case 508:
                        response = dialogflowResponse("Error 508","");
                        break;

                    default:
                        response = dialogflowResponse("Error","");
                }

                console.log(error.message)
                console.log(error.response.data.message)                    
            }   
        /*-------------------------------------------------------------------------------------------------------------*/
        


        /*------------------------------------------FREE SEAT PLOT FEATURE---------------------------------------------*/
        }else if( action == 'free-seat' ){
            
            const freeSeatsGoing = tempPersistence[session].freeSeatsGoing;
            console.log(freeSeatsGoing)
            console.log(typeof(freeSeatsGoing))
            const biggerFreeSeatsGoing = parseInt(freeSeatsGoing[freeSeatsGoing.length-1].slice(0,2));

            //Seat Columns
            let seatsPlot = "⠀      A       B      C     |      D       E      F\n";

            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

            for(let line = 1; line <= biggerFreeSeatsGoing; line++){
                
                line%6 ? seatsPlot += '' : seatsPlot += '\n';
                line <= 9 ? seatsPlot += '0' + line + ' ' : seatsPlot += '' + line + ' ';

                for(let column = 1; column <= 7; column++){
                    
                    let statusSeat = freeSeatsGoing.includes('' + line + letters[column-1]) ? '🟢' : '🔴';

                    if( column == 7 )
                        seatsPlot += '  |'+statusSeat+'|\n';
                    
                    else if( column == 4 )
                        seatsPlot += '  --';
                    
                    else
                        seatsPlot += '  |'+statusSeat+'|';
                }
            }

            seatsPlot += '\n\n🔴 - Poltrona ocupada\n🟢 - Poltrona disponível';

            response = dialogflowResponse(seatsPlot, session+"/contexts/DefaultWelcomeIntent-followup-2");
            console.log(seatsPlot)
        }

        return res.json(response);
    }
    /*-------------------------------------------------------------------------------------------------------------*/
}