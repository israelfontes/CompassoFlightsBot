const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const api_url = process.env.API_URL_FLIGHT;

//This function returns the context that has more parameters
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

function dialogflowResponse(text, outputContext){
    return {
        'fulfillmentText':text,
        'output_contexts':[{
            'name':outputContext,
            'lifespanCount': '1',
        }]
    }
}

//The information of the flight consulted temporarily persists
let tempPersistence = new Object();

module.exports = {
    async webhook(req, res){
        
        const { queryResult, session } = req.body;
        const { action, outputContexts } = queryResult;
        
        let response = {};

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
                tempPersistence[session] = result.data;
                const flight = result.data[0]
                
                let textResponse = 
                "Encontramos um voo! 😄 "+
                "\n\nCompanhia: " + flight.company +
                "\n\nSaindo de: " + flight.cityFrom + " (" + flight.whereFrom + ")" +
                "\nPara: "+ flight.cityTo + " (" + flight.whereTo + ")" +
                "\nEmbarque: " + flight.departureDate.slice(8,10) + "/" + flight.departureDate.slice(5,7) + "/" + flight.departureDate.slice(0,4) + " às " + flight.departureHour +
                "\n\nValor total: R$" + flight.price;

                response = dialogflowResponse(textResponse,session+"/contexts/DefaultWelcomeIntent-followup-2");

            }catch(error){
                console.log("error "+error.response.status)
                switch(error.response.status){
                    case 400:
                        response = dialogflowResponse("Error 400","");
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
            
            
        }

        return res.json(response);
    }
}