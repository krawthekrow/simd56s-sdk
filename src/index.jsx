// make webpack hot-reload when index.html is changed
import 'index.html';

import 'bootstrap-icons/font/bootstrap-icons.css';

import React from 'react';
import ReactDOM from 'react-dom';

import App from 'gui/App.jsx';

ReactDOM.render(<App />, document.getElementById('index'));
