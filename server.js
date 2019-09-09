var apiData = {};

apiData.clientId = 'YoVebWfliMtQsIYf8lXNwbDVUia1iAm7DhF0Smz5uZSHZtZZ';
apiData.clientSecret = 'XntoqdmpF0gYzey917XMM353iFP4KVOf48mg4xBIYWxp6Oqy';
apiData.userKey = 'EMxcTDFaBy5K1YOK';


// HAD API URLs:
apiData.apiKey = '?api_key=' + apiData.userKey;
apiData.apiUrl = 'https://api.hackaday.io/v1';
apiData.apiAuthUrl = 'https://api.hackaday.io/v1/me' + apiData.apiKey;
apiData.oAuthRedirect = 'https://hackaday.io/authorize?client_id=' + apiData.clientId + '&response_type=code';
apiData.createTokenUrl = function (code) {
    return ('https://auth.hackaday.io/access_token?' +
        'client_id=' + this.clientId +
        '&client_secret=' + this.clientSecret +
        '&code=' + code +
        '&grant_type=authorization_code');
};

if (!apiData.userKey || !apiData.clientId || !apiData.clientSecret) {
    console.log('Please fill in your client data!  See line 10 in server.js.');
    console.log('Ending node process.');
    process.exit();
}

var http = require('http'),
    express = require('express'), //http://expressjs.com/
    request = require('request'), // https://www.npmjs.com/package/request
    app = express(),
    es6Renderer = require('express-es6-template-engine'),
    server = http.createServer(app),
    path = require('path'),
    port = 3000;

server.listen(port);
console.log('Listening on port: ', port);
app.engine('html', es6Renderer);
app.set('views', 'views');
app.set('view engine', 'html');
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    console.log('\ninside /');
    res.render('index', {
        locals: {
            dataType: null,
            apiData: null
        },
        partials: {
            nav: __dirname + "/views/partials/nav.html",
            footer: __dirname + "/views/partials/footer.html"
        }
    });
});

// Queries HAD API for user data
app.get('/users/:id', function (req, res) {
    console.log('\ninside /users/:id');

    var id = req.params.id,
        url = apiData.apiUrl + '/users/' + id + apiData.apiKey;

    console.log('\nUser Data Query: ', url);

    request.get(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var bodyData = parseJSON(body);
            res.render('index', {
                locals: {
                    dataType: 'Top Skulled Projects',
                    data: bodyData
                }
            });
        } else {
            console.log('\nError: ', error, '\nResponse body: ', body);
            res.render(body);
        }
    });
});

app.get('/projects', function (req, res) {
    console.log('\ninside /projects/');
    var url = apiData.apiUrl + '/projects' + apiData.apiKey + '&sortby=views&per_page=10';
    console.log('\nProject Data Query: ', url);

    request.get(url, function (error, response, body) {
        var bodyData = parseJSON(body);
        res.render('index', {
            locals: {
                dataType: 'Latest Projects',
                data: bodyData.projects,
            },
            partials: {
                nav: __dirname + "/views/partials/nav.html",
                footer: __dirname + "/views/partials/footer.html"
            }
        });
    });
});

app.get("/projects/:id", function (req, res) {

    console.log("\n inside /projects/:id");
    var url = apiData.apiUrl + '/projects/' + req.params.id + apiData.apiKey;
    console.log("\n project data query: ", url);

    request.get(url, function (err, response, body) {
        var bodyData = parseJSON(body);
        var related;
        //console.log(bodyData);

        var url1 = apiData.apiUrl + '/search/' + apiData.apiKey + '&search_term=' + bodyData.tags[0] + "+" + bodyData.tags[1] + '&per_page=6';
        console.log(url1);

        request.get(url1, function (err, response, bd) {
            related = parseJSON(bd);

            res.render('spro', {
                locals: {
                    dataType: 'Single Product',
                    data: bodyData,
                    related: related.results
                },
                partials: {
                    nav: __dirname + "/views/partials/nav.html",
                    footer: __dirname + "/views/partials/footer.html"
                }
            })
        })
    })
});






// Queries HAD API for project data
app.get('/projects/skulls', function (req, res) {
    console.log('\ninside /projects/skulls');
    var url = apiData.apiUrl + '/projects' + apiData.apiKey + '&sortby=skulls';
    console.log('\nProject Data Query: ', url);

    request.get(url, function (error, response, body) {
        var bodyData = parseJSON(body);
        res.render('index', {
            dataType: 'Top Skulled Projects',
            apiData: bodyData
        });
    });
});



// HAD API oAuth
app.get('/authorize', function (req, res) {
    res.redirect(apiData.oAuthRedirect);
});

// HAD API Callback
app.get('/callback', function (req, res) {
    var code = req.query.code;
    if (!code) {
        return res.redirect('/');
    }

    console.log('\nAccess code: ', code);

    var postUrl = apiData.createTokenUrl(code);

    console.log('\nPost Url: ', postUrl);

    request.post(postUrl, function (err, res2, body) {

        var parsedData = parseJSON(body),
            token = null;

        if (parsedData) {
            token = parsedData.access_token;
        }

        if (!token) {
            console.log('\nError parsing access_token: ', body);
            return res.redirect('/');
        }

        console.log('\nToken: ', token);

        // Add token to header for oAuth queries
        var options = {
            url: apiData.apiAuthUrl,
            headers: { Authorization: 'token ' + token }
        };

        request.get(options, function (err, res3, body) {
            var bodyData = parseJSON(body);
            if (!bodyData) {
                console.log('\nError parsing bodyData');
                return res.redirect('/');
            }
            console.log('\noAuth successful!');
            res.render('index', {
                dataType: 'oAuth Data',
                token: token,
                apiData: bodyData
            });
        });

    });
});


app.all('*', function (req, res) {
    res.redirect('/');
});

function parseJSON(value) {
    var parsed;
    try {
        parsed = JSON.parse(value);
    } catch (e) {
        console.log('Error parsing JSON: ', e, '\nInput: ', value);
    }
    return parsed || false;
}