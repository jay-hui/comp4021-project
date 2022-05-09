const SignInForm = (() => {
    const initialize = () => {
        $("#signin-modal").hide();
        $("#register-modal-content").hide();

        // click event for switching between forms
        $(".signin-switch-button").on("click", () => {
            $("#signin-message").text("");
            $("#register-message").text("");
            if ($("#signin-modal-content").is(":hidden")) {
                $("#register-modal-content").hide();
                $("#signin-modal-content").show();
            }
            else {
                $("#signin-modal-content").hide();
                $("#register-modal-content").show();
            }
        });

        // submit event for the signin form
        $("#signin-form").on("submit", (e) => {

            // prevent submitting the form
            e.preventDefault();

            // get the input fields
            const username = $("#signin-username").val().trim();
            const password = $("#signin-password").val().trim();

            // send a signin request
            Authentication.signin(username, password,
                () => {
                    hide();
                    UserPanel.update(Authentication.getUser());
                    UserPanel.show();
                    Socket.connect();
                },
                (error) => { $("#signin-message").text(error); }
            );
        });

        $("#register-carid").on("change", (e) => {
            let carId = e.target.value;
            $("#register-carid-display").css("background-image", `url("img/car${carId}.png")`);
        })

        // submit event for the register form
        $("#register-form").on("submit", (e) => {

            // prevent submitting the form
            e.preventDefault();

            // get the input fields
            const username = $("#register-username").val().trim();
            const displayName = $("#register-displayname").val().trim();
            const carId = $("#register-carid").val();
            const password = $("#register-password").val().trim();
            const confirmPassword = $("#register-confirm").val().trim();

            // check passwords
            if (password != confirmPassword) {
                $("#register-message").text("passwords don't match.");
                return;
            }

            // send a register request
            Registration.register(username, displayName, carId, password,
                () => {
                    $("#register-form").get(0).reset();
                    $("#register-message").text("account created! redirecting to sign-in page...");
                    setTimeout(() => {
                        $(".signin-switch-button").first().trigger('click');
                    }, 2000);
                },
                (error) => { $("#register-message").text(error); }
            );
        });
    };

    const show = () => $("#signin-modal").fadeIn(500);
    const hide = () => {
        $("#signin-form").get(0).reset();
        $("#signin-message").text("");
        $("#register-message").text("");
        $("#signin-modal").fadeOut(500);
    };

    return { initialize, show, hide };
})();

const UserPanel = (() => {
    const initialize = () => {
        $("#user-panel").hide();

        // click event for signout button
        $("#signout-button").on("click", () => {
            // send a signout request
            Authentication.signout(
                () => {
                    Socket.disconnect();
                    hide();
                    SignInForm.show();
                }
            );
        });
    };

    const show = () => $("#user-panel").show();
    const hide = () => $("#user-panel").hide();

    // updates user panel
    const update = (user) => {
        if (user) {
            $("#user-panel .user-displayname").text(`hello, ${user.displayName}!`);
        }
        else {
            $("#user-panel .user-displayname").text("");
        }
    };

    return { initialize, show, hide, update };
})();

const GamePanel = (() => {
    let gameParagraph = null;
    let gameInput = null;
    let localPlayers = [];

    const initialize = () => {

        // set up jquery objects
        gameParagraph = $("#game-paragraph");
        gameInput = $("#game-input");

        // click event for ready
        $("#game-ready-button").on("click", () => {
            Socket.ready();
        });
    };

    // starts the game
    const startGame = (players, paragraph) => {
        const startTime = new Date();
        const wordArray = paragraph.split(' ');
        let currentWordIndex = 0;

        const charCountArray = [];
        let charCount = 0;
        for (word of wordArray) {
            charCount += word.length + 1;
            charCountArray.push(charCount);
        }

        let wpm = 0;
        let width = 15;
        let playerIndex = 0;

        // clear racetracks
        for (let i = 0; i < 4; i++) {
            $(`#game-car-${i}`).hide();
        }
        gameParagraph.empty();

        // get the current user
        const currentUser = Authentication.getUser();

        // add cars one by one
        for (let i = 0; i < players.length; i++) {
            localPlayers.push(players[i]);
            if (players[i].username == currentUser.username) playerIndex = i;
            $(`#game-car-${i}`).css("background-image", `url("img/car${players[i].carId}.png")`)
            $(`#game-car-${i}`).show();
            $(`#game-userdata-${i}`).text(`${players[i].displayName}`)
        }
        wordArray.forEach((word) => {
            const wordSpan = $("<span></span>").text(word + ' ');
            gameParagraph.append(wordSpan);
        });

        // handle keydown event
        gameInput.keydown((e) => {
            const inputValue = gameInput.val().trim();

            if (e.key == ' ') {
                // if word is correct
                if (inputValue == wordArray[currentWordIndex]) {
                    wpm = Math.floor((charCountArray[currentWordIndex] / 5) / ((new Date() - startTime) / 60000));
                    width = Math.floor(charCountArray[currentWordIndex] / paragraph.length * 80) + 15;
                    $(`#game-flexbox-${playerIndex}`).css("width", width + '%');
                    $('#game-paragraph > span').eq(currentWordIndex).css("color", "grey");
                    gameInput.val('');
                    currentWordIndex++;
                }

                // if word is incorrect
                else {
                    wpm = currentWordIndex ? Math.floor((charCountArray[currentWordIndex - 1] / 5) / ((new Date() - startTime) / 60000)) : 0;
                    $('#game-paragraph > span').eq(currentWordIndex).css("color", "red");
                }
                // call function in socket.js to emit "current wpm" event
                Socket.currentWPM(wpm, width);
                if (currentWordIndex >= wordArray.length) {
                    console.log('end, your wpm is ' + wpm);
                    // call function in socket.js to emit "complete" event
                    Socket.complete(wpm);
                }
            }
        });
    };

    // updates WPM and position of cars other than the player
    const updateWPM = (user, wpm, width) => {
        if (user.username == Authentication.getUser().username) return;
        let otherPlayerIndex = localPlayers.findIndex((player) => player.username == user.username);
        if (otherPlayerIndex == -1) return;

        $(`#game-flexbox-${playerIndex}`).css("width", width + '%');
    }

    return { initialize, startGame, updateWPM };
})();

const UI = (() => {
    const getUserDisplay = (user) => {
        return $("<div class='row'></div>")
            .append($(`<span>hello, ${user.displayName}!</span>`));
    };

    // all components of ui
    const components = [SignInForm, UserPanel, GamePanel];


    const initialize = () => {
        for (const component of components) {
            component.initialize();
        }
    };

    return { getUserDisplay, initialize };
})();
