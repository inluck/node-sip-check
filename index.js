////////////////////////////////////////
/////
///// SIP Options Health Check
/////
///// Jon Mitchell - September 2022
///// Alt Telecom 
///// jon@altinc.ca
/////
////////////////////////////////////////

require = require("esm")(module/* , options */)

module.exports = require("./main.js")

const { performance } = require('perf_hooks');
const NetcatClient = require('netcat/client')

const http = require('http')
const url = require('url');

var nc = new NetcatClient()

function onReady() {
    startTime = performance.now()
}
function sipCheck(option, server) {
    nc.udp()
        .port(5060)
        .wait(1000)
        .init()
        .send(option, server)
        .on('ready', onReady)
        .on('data', function (res) {
            endTime = performance.now()
            console.log(res.data.toString())
            let regexResult = res.data.toString().search(/^(SIP\/2.0)/)
            if (regexResult === 0) {
                data += `<pingdom_http_custom_check>
                <status>OK</status>
                <response_time>${endTime - startTime}</response_time>
                </pingdom_http_custom_check>`;
                response.header("Content-Type", "application/xml");
                response.status(200).send(data);
            } else {
                data += `<pingdom_http_custom_check>
                <status>FAIL</status>
                <response_time>${endTime - startTime}</response_time>
                </pingdom_http_custom_check>`;
                response.header("Content-Type", "application/xml");
                response.status(200).send(data);
            }
        })
}

const app = http.createServer((request, response) => {
    const queryObject = url.parse(request.url, true).query;
    let server = queryObject['SBC']
    var source = "159.2.121.134"
    var option = `OPTIONS sip:${server} SIP/2.0
    Via: SIP/2.0/UDP ${source}
    From: <sip:monitoring@1${source}>
    To: sip:monitoring@${server}
    Call-ID: monitoring@${source}
    CSeq: 1 OPTIONS
    `
    sipCheck(option, server)

})

const PORT = 3002
app.listen(PORT)
console.log(`Server running on port ${PORT}`)