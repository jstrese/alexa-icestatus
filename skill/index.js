var request = require('request'),
    xml2js  = require('xml2js');

var parser  = new xml2js.Parser({
    strict: false,
    trim: true
});

var listInformational   = [],
    listPerformance     = [],
    DataURL             = "https://emstatuscenter.elliemae.com/services.rss";

//
// Download the service status feed and parse it from XML to a JS Object
//
function LoadRSS()
{
    return new Promise(function(resolve, reject) {
        request.get(
            DataURL,
            function(error, response, body) {
                if(error) {
                    reject(null);
                }

               return parser.parseString(
                    body,
                    function(err, result) {
                        if(!err)
                        {
                            resolve(result);
                        }

                        reject(null);
                    }
                );
        });
    });
}

//
// Loop through the data feed and populate informational and
// performance impacting issues into our arrays
//
async function ParseFeed()
{
    await LoadRSS().then(
        function(result) {
            result.RSS.CHANNEL[0].ITEM.forEach(element => {
                let title = String(element.TITLE).substr(
                    0,
                    String(element.TITLE).lastIndexOf("- ")
                ).trim()
                .replace(/\s/g, "");

                let status = String(element.TITLE).substr(
                    String(element.TITLE).lastIndexOf("- ")+2
                ).trim();

                if(status == "Performance Issues")
                    listPerformance.push(title);
                else if(status == "Informational")
                    listInformational.push(title);
            });
        },
        function (reject) {
            outageString = "Sorry, it looks like we are having a problem connecting to the status center right now.";
        }
    );
}

//
// Checks the response intent data to make sure we have a valid product value
//
function HasValidProduct(intent)
{
    try {
        if(intent.slots.PRODUCT.resolutions.resolutionsPerAuthority[0].status.code == 'ER_SUCCESS_MATCH')
            return true;
    } catch (err) {
        // avoiding reference errors
    }

    return false;
}

//
// Grabs the product ID value from the intent response
//
function GetProductValue(intent)
{
    return intent.slots.PRODUCT.resolutions.resolutionsPerAuthority[0].values[0].value.id;
}

//
// Build the output string for this intent
//
function HandleIntent()
{
    let output = "According to the Status Center, ";

    if(listPerformance.length == 0 && listInformational.length == 0)
    {
        output += "there are no performance issues or informational messages at the moment.";
    }
    else
    {
        if(listPerformance.length < 0)
            output += "there are no performance issues ongoing. ";
        else
            output += "there " + ((listPerformance.length > 1 || listPerformance.length == 0) ? "are " : "is ") +
            (listPerformance.length == 0 ? "no" : (listPerformance.length == 1 ? "a" : listPerformance.length)) +
            ((listPerformance.length > 1 || listPerformance.length == 0 ? " services " : " service ")) +
            "with performance issues right now. ";

        if(listInformational.length == 0)
            output += "Additionally, no services have informational messages.";
        else
            output += (listPerformance.length > 0 ? "Additionally, there are " : "There are however ") +
            "services with informational messages.";
    }

    return output;
}

//
// Handle the intent if it contains a valid product ID
//
function HandleProductIntent(id)
{
    let output = "At the moment, ";

    if(listPerformance.includes(id))
    {
        output = "It looks like that service may be impacted by performance issues right now. We recommend checking the status center for more details.";
    }
    else
    {
        output += "this service reportedly operating as usual.";

        if(listInformational.includes(id))
        {
            output += " There is however an informational message posted for this service. Please check the status center for more details.";
        }
    }

    return output;
}

exports.handler = async (event, context, callback) => {
    await ParseFeed().then(function(result){
        let outputString;

        if(HasValidProduct(event.request.intent))
            outputString = HandleProductIntent(
                GetProductValue(event.request.intent)
            );
        else
            outputString = HandleIntent();

        var responseJson =
        {
            version: "1.0",
            response:
            {
                outputSpeech:
                {
                    type: "PlainText",
                    text: outputString
                },
                shouldEndSession: true
            },
            sessionAttributes: {}
        };

        callback(null, responseJson);
    });
};
