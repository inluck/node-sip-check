////////////////////////////////////////
/////
///// node SIP check
/////
///// Jon Mitchell - September 2022
///// Alt Telecom 
///// jon@altinc.ca
/////
////////////////////////////////////////

require = require("esm")(module/* , options */)
require('newrelic');

module.exports = require("./main.js")

const http = require('http')
const url = require('url');
const { performance } = require('perf_hooks');

const NetcatClient = require('netcat/client')

const app = http.createServer((request, response) => {
    const queryObject = url.parse(request.url, true).query;
    let server = queryObject['SBC']

    if(server == null || server == '') {
        server = "inbound-sbc1.tor.apbx.ca"
    }

    try {
        var source = "159.2.121.134"
        var option = `OPTIONS sip:${server} SIP/2.0
Via: SIP/2.0/UDP ${source}
From: <sip:monitoring@1${source}>
To: sip:monitoring@${server}
Call-ID: monitoring@${source}
CSeq: 1 OPTIONS
`

        function sipCheck(option) {
            var nc = new NetcatClient()
            const startTime = performance.now().toPrecision()
            nc.udp()
                .port(5060)
                .wait(75)
                .init()
                .send(option, server)
                .on('data', function (res, starTime) {
                    const endTime = performance.now().toPrecision()
                    const regexResult = res.data.toString().search(/^(SIP\/2.0)/)
                    if (regexResult === 0) {
                        const responseTime = endTime - startTime
                        const data = `<pingdom_http_custom_check>
                <status>OK</status>
                <response_time>${responseTime.toFixed(3)}</response_time>
                </pingdom_http_custom_check>`
                        response.writeHead(200, { 'Content-Type': 'application/xml' })
                        response.end(data)
                    } else {
                        const data = `<pingdom_http_custom_check>
                <status>NOTOK</status>
                <response_time>${responseTime.toFixed(3)}</response_time>
                </pingdom_http_custom_check>`
                        response.writeHead(200, { 'Content-Type': 'application/xml' })
                        response.end(data)
                    }
                    nc.close()
                })
        }

        sipCheck(option)

    }
    catch (err) {
        const data = `<pingdom_http_custom_check>
                <status>UNAVAILABLE</status>
                <error>${err}</error>
                </pingdom_http_custom_check>`
        response.writeHead(503, { 'Content-Type': 'application/xml' })
        response.end(data)
    }
})

const PORT = 3002
var server = app.listen(PORT)
server.setTimeout(100);

console.log(`Server running on port ${PORT}`)
