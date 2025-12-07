/* GLOBALS + CONSTANTS */

const enumAnswers = {
    UNKNOWN_LOC: 0,
    SIERRA_TOWER: 1,
    MATADOR_HALL: 2,
    MAPLE_HALL: 3,
    LIVE_OAK_HALL: 4,
    CITRUS_HALL: 5,
};

const questions = [
    {
        text: "Where is Sierra Tower?",
        status: "unanswered",
        answer: enumAnswers.SIERRA_TOWER,
    },
    {
        text: "Where is Matador Hall?",
        status: "unanswered",
        answer: enumAnswers.MATADOR_HALL,
    },
    {
        text: "Where is Maple Hall?",
        status: "unanswered",
        answer: enumAnswers.MAPLE_HALL,
    },
    {
        text: "Where is Live Oak Hall?",
        status: "unanswered",
        answer: enumAnswers.LIVE_OAK_HALL,
    },
    {
        text: "Where is Citrus Hall?",
        status: "unanswered",
        answer: enumAnswers.CITRUS_HALL,
    },
];

let currentQuestionIndex = questions.length;
let questionsCorrect = 0;
let timePassed = 0.0;
let timerIntervalId = null;
const timerPrecision = 100; // ms
const timerFractionsShown = 1;

const sierraTowerCoords = [
    { lat: 34.23844915667311, lng: -118.53013980471616 },
    { lat: 34.23844690067792, lng: -118.53029625210044 },
    { lat: 34.23910158276765, lng: -118.53029088768241 },
    { lat: 34.23909603933364, lng: -118.53013397845422 },
    { lat: 34.23844915667311, lng: -118.53013980471616 },
];

const matadorHallCoords = [
    { lat: 34.23965637611397, lng: -118.52841602621187 },
    { lat: 34.239659147812574, lng: -118.52815585193606 },
    { lat: 34.23920352615637, lng: -118.52814907576455 },
    { lat: 34.23920684845871, lng: -118.52840728191144 },
    { lat: 34.23965637611397, lng: -118.52841602621187 },
];

const mapleHallCoords = [
    { lat: 34.23781504419548, lng: -118.53150343363707 },
    { lat: 34.237817346663924, lng: -118.5309472395978 },
    { lat: 34.23739935492568, lng: -118.53094641880686 },
    { lat: 34.23739935492568, lng: -118.5309964871104 },
    { lat :34.23733624885017, lng: -118.53106379204299 },
    { lat: 34.23733557028994, lng: -118.53116557023372 },
    { lat: 34.23738306949137, lng: -118.53120743061864 },
    { lat: 34.23739935492568, lng: -118.53120743061864 },
    { lat: 34.23740003348539, lng: -118.53149634935363 },
    { lat: 34.23781504419548, lng: -118.53150343363707 },
];

const liveOakCoords = [
    { lat: 34.238373112939655, lng: -118.52880080835664 },
    { lat: 34.23817689365946, lng: -118.5288020381549 },
    { lat: 34.238170533407924, lng: -118.52763365276225 },
    { lat: 34.23837319609627, lng: -118.52763264806906 },
    { lat: 34.238373112939655, lng: -118.52880080835664 },
];

const citrusHallCoords = [
    { lat: 34.23912625357581, lng: -118.52855872629551 },
    { lat: 34.23912421793845, lng: -118.52765749683236 },
    { lat: 34.23903736403187, lng: -118.52765667604051 },
    { lat: 34.23903736403187, lng: -118.52760578694513 },
    { lat: 34.238966116619736, lng: -118.52760742852887 },
    { lat: 34.238964080978505, lng: -118.52765667604051 },
    { lat: 34.23892472523835, lng: -118.52765749683236 },
    { lat: 34.23892268959611, lng: -118.5282640620175 },
    { lat: 34.23901090071442, lng: -118.52826570360124},
    { lat: 34.23901090071442, lng: -118.5283748689187 },
    { lat: 34.238985115935556, lng: -118.5283748689187 },
    { lat: 34.238984437388616, lng: -118.5285595470874 },
    { lat: 34.23912625357581, lng: -118.52855872629551 },
];


const questionSection = document.querySelector("#question-section");
const controlButton = document.querySelector("#control-button");
const scoreEl = document.querySelector("#score");
const timerEl = document.querySelector("#timer");

const gameBeganEvent = new Event('game-began');
const questionAnswered = new Event('question-answered');


/* LISTENERS */

controlButton.addEventListener('click', e => {
    document.dispatchEvent(gameBeganEvent);
    controlButton.innerText = 'Restart';
});

document.addEventListener('game-began', () => {
    // clear all question elements
    const questionEls = questionSection.children;
    for(let i = questionEls.length - 1; i >= 0; i--) {
        const el = questionEls[i];
        if(el.classList.contains('question')) {
            questionSection.removeChild(questionEls[i]);
        }
    }

    questionsCorrect = 0;
    resetQuestionObjs();
    resetPolygons();
    resetScore();
    resetTimer();

    // add first question
    currentQuestionIndex = 0;
    addQuestion(questions[currentQuestionIndex]);

    // start timer
    startTimer();
});

document.addEventListener('question-answered', () => {
    if(currentQuestionIndex >= questions.length) return; // do nothing

    updatePolygon(questions[currentQuestionIndex]);
    updateQuestionEl(currentQuestionIndex);
    updateScore(questionsCorrect, currentQuestionIndex);

    currentQuestionIndex++;
    if(currentQuestionIndex >= questions.length) {
        // game over
        stopTimer();
    } else {
        addQuestion(questions[currentQuestionIndex]);
    }
})


/* GOOGLE MAPS API SETUP */

let map;
let sierraTowerPolygon;

let matadorHallPolygon;

let mapleHallPolygon;

let liveOakPolygon;

let citrusHallPolygon;
async function initMap() {
    const styles = [
        {
            featureType: "all",
            elementType: "labels",
            stylers: [{ visibility: 'off'}],
        }
    ]

    //  Request the needed libraries.
    const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
        google.maps.importLibrary('maps'),
        google.maps.importLibrary('marker'),
    ]);
    // Get the gmp-map element.
    const mapElement = document.getElementById('map');
    map = new Map(mapElement, {
        center: { lat: 34.23961322987335, lng: -118.5289617556713 },

        styles: styles,

        zoom: 16.6,
        zoomControl: false,
        gestureHandling: "none",

        disableDefaultUI: true,

        cameraControl: false,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
    });


    sierraTowerPolygon = new google.maps.Polygon(getPolygonOptions(sierraTowerCoords, 'unanswered'));
    sierraTowerPolygon.setMap(map);

    matadorHallPolygon = new google.maps.Polygon(getPolygonOptions(matadorHallCoords, 'unanswered'));
    matadorHallPolygon.setMap(map);

    mapleHallPolygon = new google.maps.Polygon(getPolygonOptions(mapleHallCoords, 'unanswered'));
    mapleHallPolygon.setMap(map);

    liveOakPolygon = new google.maps.Polygon(getPolygonOptions(liveOakCoords, 'unanswered'));
    liveOakPolygon.setMap(map);

    citrusHallPolygon = new google.maps.Polygon(getPolygonOptions(citrusHallCoords, 'unanswered'));
    citrusHallPolygon.setMap(map);


    map.addListener('dblclick', e => {
        answerQuestion(enumAnswers.UNKNOWN_LOC, currentQuestionIndex);
    });

    sierraTowerPolygon.addListener('dblclick', e => {
        answerQuestion(enumAnswers.SIERRA_TOWER, currentQuestionIndex);
    });

    matadorHallPolygon.addListener('dblclick', e => {
        answerQuestion(enumAnswers.MATADOR_HALL, currentQuestionIndex);
    });

    mapleHallPolygon.addListener('dblclick', e => {
        answerQuestion(enumAnswers.MAPLE_HALL, currentQuestionIndex);
    });

    liveOakPolygon.addListener('dblclick', e => {
        answerQuestion(enumAnswers.LIVE_OAK_HALL, currentQuestionIndex);
    });

    citrusHallPolygon.addListener('dblclick', e => {
        answerQuestion(enumAnswers.CITRUS_HALL, currentQuestionIndex);
    });


}

window.initMap = initMap;


/* FUNCTIONS */

function answerQuestion(answer, questionIndex) {
    if(questionIndex >= questions.length) return;

    const question = questions[questionIndex];
    const isCorrect = answer === question.answer;
    if(isCorrect) questionsCorrect++;
    question.status = isCorrect ? 'correct' : 'incorrect';
    
    document.dispatchEvent(questionAnswered);

    return isCorrect;
}

function updatePolygon(question) {
    switch(question.answer) {
        case enumAnswers.SIERRA_TOWER:
            sierraTowerPolygon.setOptions(getPolygonOptions(sierraTowerCoords, question.status));
            break;
        case enumAnswers.MATADOR_HALL:
            matadorHallPolygon.setOptions(getPolygonOptions(matadorHallCoords, question.status));
            break;
        case enumAnswers.MAPLE_HALL:
            mapleHallPolygon.setOptions(getPolygonOptions(mapleHallCoords, question.status));
            break;
        case enumAnswers.LIVE_OAK_HALL:
            liveOakPolygon.setOptions(getPolygonOptions(liveOakCoords, question.status));
            break;
        case enumAnswers.CITRUS_HALL:
            citrusHallPolygon.setOptions(getPolygonOptions(citrusHallCoords, question.status));
            break;
    }
}

function resetPolygons() {
    sierraTowerPolygon.setOptions(getPolygonOptions(sierraTowerCoords, 'unanswered'));
    matadorHallPolygon.setOptions(getPolygonOptions(matadorHallCoords, 'unanswered'));
    mapleHallPolygon.setOptions(getPolygonOptions(mapleHallCoords, 'unanswered'));
    liveOakPolygon.setOptions(getPolygonOptions(liveOakCoords, 'unanswered'));
    citrusHallPolygon.setOptions(getPolygonOptions(citrusHallCoords, 'unanswered'));
}

function getPolygonOptions(coords, displayType) {
    const fillColor = displayType === 'correct'
                ? '#449955'
                : displayType === 'incorrect'
                ? '#995544'
                : displayType === 'unanswered'
                ? '#00000000'
                : '#00000000';

    const strokeColor = displayType === 'unanswered'
                        ? '#00000000'
                        : '#000000'

    return {
        paths: coords,
        strokeColor,
        strokeOpacity: 1,
        strokeWeight: 1,
        fillColor,
        fillOpacity: 0.6,
        cursor: 'default',
    }
}

function addQuestion(question) {
    const questionEl = document.createElement('h2');
    questionEl.classList.add('question', question.status);
    questionEl.innerText = question.text;
    questionSection.appendChild(questionEl);
}

function updateQuestionEl(questionIndex) {
    if(questionIndex < 0 || questionIndex >= questions.length) return;
    const questionEls = [...questionSection.children]
            .filter(c => c.classList.contains('question'));

    const question = questions[questionIndex];
    const questionEl = questionEls[questionIndex];
    if(!questionEl) return;

    questionEl.classList.remove('unanswered', 'incorrect', 'correct');
    questionEl.classList.add(question.status);
}

function resetQuestionObjs() {
    for(const question of questions) {
        question.status = 'unanswered';
    }
}

function updateScore(score, questionIndex) {
    scoreEl.innerText = `${score}/${questionIndex + 1}`;
}

function resetScore() {
    scoreEl.innerText = '0/0';
}

function resetTimer() {
    timePassed = 0.0;
    clearInterval(timerIntervalId);
}

function startTimer() {
    timerIntervalId = setInterval(() => {
        timePassed += timerPrecision / 1000;
        timerEl.innerText = timePassed.toFixed(timerFractionsShown);
    }, timerPrecision);
}

function stopTimer() {
    clearInterval(timerIntervalId);
}
