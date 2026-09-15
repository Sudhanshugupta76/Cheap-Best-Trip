// ============================================
// IRCTC Redesign - Main JavaScript
// ============================================

// Tab switching for search forms
function setTab(btn, tabType) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  // Hide all forms
  document.getElementById('trainForm').style.display = 'none';
  document.getElementById('flightForm').style.display = 'none';
  document.getElementById('hotelForm').style.display = 'none';

  // Show selected form
  if (tabType === 'train') {
    document.getElementById('trainForm').style.display = 'block';
  } else if (tabType === 'flight') {
    document.getElementById('flightForm').style.display = 'block';
  } else if (tabType === 'hotel') {
    document.getElementById('hotelForm').style.display = 'block';
  }

  // Hide all results
  document.getElementById('trainResults').classList.remove('active');
  document.getElementById('flightResults').classList.remove('active');
  document.getElementById('hotelResults').classList.remove('active');
}

// Swap stations (train & flight)
function swapStations(type) {
  let fromId, toId;
  if (type === 'train') {
    fromId = 'trainFrom';
    toId = 'trainTo';
  } else {
    fromId = 'flightFrom';
    toId = 'flightTo';
  }
  const from = document.getElementById(fromId);
  const to = document.getElementById(toId);
  const temp = from.value;
  from.value = to.value;
  to.value = temp;
}

function openLogin() {
  openAuthOverlay('login');
}

function openRegister() {
  openAuthOverlay('register');
}

function closeLogin() {
  document.getElementById('loginOverlay').style.display = 'none';
}

function openAuthOverlay(tab) {
  document.getElementById('loginOverlay').style.display = 'flex';
  switchAuthTab(tab);
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const title = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const loginTab = document.getElementById('authLoginTab');
  const registerTab = document.getElementById('authRegisterTab');

  if (tab === 'register') {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    title.textContent = 'Create your Cheap & Best Trip account';
    subtitle.textContent = 'Register now to book tickets, save journeys, and get alerts.';
    loginTab.classList.remove('active');
    registerTab.classList.add('active');
  } else {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    title.textContent = 'Login to Cheap & Best Trip';
    subtitle.textContent = 'Access bookings, PNR status, and personalized offers.';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  }
}

function showRegister(event) {
  if (event) event.preventDefault();
  switchAuthTab('register');
}

function showLogin(event) {
  if (event) event.preventDefault();
  switchAuthTab('login');
}

function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!email || !password) {
    alert('Please enter both email/mobile and password.');
    return;
  }

  document.getElementById('loginBtn').textContent = 'Hi, User';
  document.getElementById('loginBtn').classList.add('btn-primary');
  document.getElementById('loginBtn').classList.remove('btn-ghost');
  closeLogin();
  alert('Logged in successfully!');
}

function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const confirmPassword = document.getElementById('registerConfirmPassword').value.trim();

  if (!name || !email || !password || !confirmPassword) {
    alert('Please fill in all registration fields.');
    return;
  }
  if (password !== confirmPassword) {
    alert('Passwords do not match.');
    return;
  }

  document.getElementById('loginBtn').textContent = 'Hi, ' + name.split(' ')[0];
  document.getElementById('loginBtn').classList.add('btn-primary');
  document.getElementById('loginBtn').classList.remove('btn-ghost');
  closeLogin();
  alert('Account created successfully!');
}

const bookingState = {
  step: 1,
  selectedTrain: null,
  selectedClass: null,
  seatCount: 1,
  passengerName: '',
  passengerType: 'adult',
  passengerAge: '',
  passengerGender: 'male',
  paymentMethod: 'netbanking',
  netBank: 'HDFC',
  upiMethod: 'Google Pay'
};

function startSeatBooking(index) {
  const train = mockTrains[index];
  bookingState.selectedTrain = train;
  bookingState.selectedClass = train.classes[0]?.name || '3A';
  bookingState.seatCount = 1;
  bookingState.paymentMethod = 'netbanking';
  bookingState.netBank = 'HDFC';
  bookingState.upiMethod = 'Google Pay';
  bookingState.step = 1;
  document.getElementById('bookingOverlay').style.display = 'flex';
  renderBookingStep();
}

function closeBooking() {
  document.getElementById('bookingOverlay').style.display = 'none';
}

function renderBookingStep() {
  const step1 = document.getElementById('bookingStep1');
  const step2 = document.getElementById('bookingStep2');
  const step3 = document.getElementById('bookingStep3');
  const stepLabel = document.getElementById('bookingStepLabel');
  const trainName = document.getElementById('bookingTrainName');
  const trainRoute = document.getElementById('bookingTrainRoute');
  const classSelect = document.getElementById('bookingClassSelect');
  const passengerInput = document.getElementById('bookingPassengerName');
  const passengerTypeInput = document.getElementById('bookingPassengerType');
  const passengerAgeInput = document.getElementById('bookingPassengerAge');
  const passengerGenderInput = document.getElementById('bookingPassengerGender');
  const passengerSummary = document.getElementById('bookingPassengerNameSummary');
  const passengerDetailsSummary = document.getElementById('bookingPassengerDetailsSummary');
  const netBankingOptions = document.getElementById('netBankingOptions');
  const upiOptions = document.getElementById('upiOptions');
  const seatCounter = document.getElementById('bookingSeatCount');
  const priceInfo = document.getElementById('bookingFareDetails');
  const gstAmount = document.getElementById('bookingGST');
  const serviceTax = document.getElementById('bookingServiceTax');
  const totalSummary = document.getElementById('bookingTotalSummary');
  const termsText = document.getElementById('bookingTermsText');

  const train = bookingState.selectedTrain;
  if (!train) return;

  trainName.textContent = train.name + ' #' + train.number;
  trainRoute.textContent = train.from + ' → ' + train.to;
  classSelect.innerHTML = train.classes.map(c => `<option value="${c.name}" ${c.name === bookingState.selectedClass ? 'selected' : ''}>${c.name}</option>`).join('');
  seatCounter.textContent = bookingState.seatCount;

  const baseFare = getClassFare(bookingState.selectedClass);
  const subtotal = baseFare * bookingState.seatCount;
  const gst = Math.round(subtotal * 0.05);
  const service = Math.round(subtotal * 0.12);
  const total = subtotal + gst + service;

  if (passengerInput) passengerInput.value = bookingState.passengerName;
  if (passengerTypeInput) passengerTypeInput.value = bookingState.passengerType;
  if (passengerAgeInput) passengerAgeInput.value = bookingState.passengerAge;
  if (passengerGenderInput) passengerGenderInput.value = bookingState.passengerGender;
  if (passengerSummary) passengerSummary.textContent = `Passenger: ${bookingState.passengerName || 'Not provided'}`;
  if (passengerDetailsSummary) passengerDetailsSummary.textContent = `${bookingState.passengerType.charAt(0).toUpperCase() + bookingState.passengerType.slice(1)}, Age ${bookingState.passengerAge || 'N/A'}, ${bookingState.passengerGender.charAt(0).toUpperCase() + bookingState.passengerGender.slice(1)}`;
  if (netBankingOptions) netBankingOptions.style.display = bookingState.paymentMethod === 'netbanking' ? 'block' : 'none';
  if (upiOptions) upiOptions.style.display = bookingState.paymentMethod === 'upi' ? 'block' : 'none';
  document.querySelectorAll('.bank-option-card').forEach(card => card.classList.remove('active'));
  const selectedBankButton = document.getElementById(`bank${bookingState.netBank}`);
  if (selectedBankButton) selectedBankButton.classList.add('active');
  document.querySelectorAll('.upi-option-card').forEach(card => card.classList.remove('active'));
  const selectedUPIButton = document.getElementById(`upi${bookingState.upiMethod.replace(/\s+/g, '')}`);
  if (selectedUPIButton) selectedUPIButton.classList.add('active');
  priceInfo.textContent = `Fare per seat: ₹${baseFare} × ${bookingState.seatCount} = ₹${subtotal}`;
  gstAmount.textContent = `GST (5%): ₹${gst}`;
  serviceTax.textContent = `Service Fee (12%): ₹${service}`;
  totalSummary.textContent = `Total payable: ₹${total}`;
  termsText.textContent = 'By continuing, you agree to the Cheap & Best Trip Terms and Conditions and refund policy.';

  step1.style.display = bookingState.step === 1 ? 'block' : 'none';
  step2.style.display = bookingState.step === 2 ? 'block' : 'none';
  step3.style.display = bookingState.step === 3 ? 'block' : 'none';
  stepLabel.textContent = bookingState.step === 1 ? 'Select your seat' : bookingState.step === 2 ? 'Accept Terms & Conditions' : 'Choose payment method';

  document.querySelectorAll('.payment-method-card').forEach(card => {
    card.classList.remove('active');
  });
  const selectedMethodButton = document.getElementById(`method${bookingState.paymentMethod.charAt(0).toUpperCase() + bookingState.paymentMethod.slice(1)}`);
  if (selectedMethodButton) selectedMethodButton.classList.add('active');
}

function changeBookingClass(event) {
  bookingState.selectedClass = event.target.value;
  renderBookingStep();
}

function updateBookingSeats(change) {
  let seats = bookingState.seatCount + change;
  if (seats < 1) seats = 1;
  if (seats > 6) seats = 6;
  bookingState.seatCount = seats;
  renderBookingStep();
}

function updatePassengerName(event) {
  bookingState.passengerName = event.target.value;
}

function updatePassengerType(event) {
  bookingState.passengerType = event.target.value;
  renderBookingStep();
}

function updatePassengerAge(event) {
  bookingState.passengerAge = event.target.value;
}

function updatePassengerGender(event) {
  bookingState.passengerGender = event.target.value;
}

function proceedToTerms() {
  bookingState.step = 2;
  renderBookingStep();
}

function acceptTerms() {
  if (!bookingState.passengerName.trim()) {
    alert('Please enter passenger name before continuing.');
    return;
  }
  if (!bookingState.passengerAge || Number(bookingState.passengerAge) <= 0) {
    alert('Please enter a valid passenger age.');
    return;
  }
  if (!document.getElementById('bookingAcceptTerms').checked) {
    alert('Please accept terms and conditions to continue.');
    return;
  }
  bookingState.step = 3;
  renderBookingStep();
}

function selectPaymentMethod(method) {
  bookingState.paymentMethod = method;
  if (method === 'netbanking' && !bookingState.netBank) {
    bookingState.netBank = 'HDFC';
  }
  renderBookingStep();
}

function selectNetBank(bank) {
  bookingState.netBank = bank;
  renderBookingStep();
}

function selectUPIMethod(method) {
  bookingState.upiMethod = method;
  renderBookingStep();
}

function confirmBooking() {
  closeBooking();
  const paymentMethod = formatPaymentMethod(bookingState.paymentMethod);
  let paymentText = paymentMethod;
  if (bookingState.paymentMethod === 'netbanking') {
    paymentText += ` (${bookingState.netBank})`;
  } else if (bookingState.paymentMethod === 'upi') {
    paymentText += ` (${bookingState.upiMethod})`;
  }
  alert(`Payment selected: ${paymentText}. Booking confirmed!`);
}

function getClassFare(className) {
  const fares = {
    '1A': 2600,
    '2A': 1900,
    '3A': 1200,
    'CC': 850,
    'SL': 550,
    '3E': 700
  };
  return fares[className] || 950;
}

function formatPaymentMethod(method) {
  const mapping = {
    netbanking: 'Net Banking',
    debit: 'Debit Card',
    wallet: 'Wallet',
    upi: 'UPI',
    emi: 'EMI'
  };
  return mapping[method] || method;
}

// Guest counter for hotels
function updateGuests(change) {
  const el = document.getElementById('guestCount');
  let val = parseInt(el.textContent) + change;
  if (val < 1) val = 1;
  if (val > 10) val = 10;
  el.textContent = val;
}

function updateRooms(change) {
  const el = document.getElementById('roomCount');
  let val = parseInt(el.textContent) + change;
  if (val < 1) val = 1;
  if (val > 5) val = 5;
  el.textContent = val;
}

// Set route from quick chips
function setRoute(from, to) {
  const fromMap = {
    'NDLS': 'New Delhi (NDLS)',
    'BCT': 'Mumbai Central (MMCT)',
    'HWH': 'Howrah (HWH)',
    'MAS': 'Chennai Central (MAS)',
    'SBC': 'Bangalore City (SBC)',
    'CNB': 'Kanpur Central (CNB)',
    'BPL': 'Bhopal (BPL)',
    'ADI': 'Ahmedabad (ADI)',
    'DEL': 'New Delhi (DEL)',
    'BOM': 'Mumbai (BOM)',
    'BLR': 'Bangalore (BLR)',
    'MAA': 'Chennai (MAA)',
    'CCU': 'Kolkata (CCU)',
    'HYD': 'Hyderabad (HYD)',
    'GOI': 'Goa (GOI)'
  };

  const trainForm = document.getElementById('trainForm');
  const flightForm = document.getElementById('flightForm');

  if (trainForm.style.display !== 'none') {
    document.getElementById('trainFrom').value = fromMap[from] || from;
    document.getElementById('trainTo').value = fromMap[to] || to;
  } else if (flightForm.style.display !== 'none') {
    document.getElementById('flightFrom').value = fromMap[from] || from;
    document.getElementById('flightTo').value = fromMap[to] || to;
  }

  document.querySelector('.search-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Set hotel city
function setHotelCity(city) {
  document.getElementById('hotelCity').value = city;
  document.querySelector('.search-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// MOCK DATA
// ============================================

const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const mockTrains = [
  {
    name: 'Rajdhani Express',
    number: '12951',
    from: 'NDLS',
    to: 'MMCT',
    dep: '16:25',
    arr: '08:15',
    duration: '15h 50m',
    days: [1, 1, 1, 1, 1, 1, 1],
    classes: [
      { name: '1A', status: 'avail', seats: '12 seats' },
      { name: '2A', status: 'avail', seats: '45 seats' },
      { name: '3A', status: 'wait', seats: 'WL 15' }
    ]
  },
  {
    name: 'Duronto Express',
    number: '12263',
    from: 'NDLS',
    to: 'MMCT',
    dep: '22:30',
    arr: '15:50',
    duration: '17h 20m',
    days: [1, 0, 1, 0, 1, 0, 1],
    classes: [
      { name: '1A', status: 'avail', seats: '6 seats' },
      { name: '2A', status: 'wait', seats: 'WL 8' },
      { name: '3A', status: 'avail', seats: '28 seats' }
    ]
  },
  {
    name: 'August Kranti Rajdhani',
    number: '12953',
    from: 'NDLS',
    to: 'MMCT',
    dep: '17:05',
    arr: '09:45',
    duration: '16h 40m',
    days: [1, 1, 1, 1, 1, 1, 1],
    classes: [
      { name: '1A', status: 'full', seats: 'Not Available' },
      { name: '2A', status: 'avail', seats: '22 seats' },
      { name: '3A', status: 'avail', seats: '56 seats' }
    ]
  },
  {
    name: 'Mumbai Rajdhani',
    number: '12952',
    from: 'NDLS',
    to: 'MMCT',
    dep: '16:55',
    arr: '08:35',
    duration: '15h 40m',
    days: [1, 1, 1, 1, 1, 1, 1],
    classes: [
      { name: '1A', status: 'avail', seats: '8 seats' },
      { name: '2A', status: 'avail', seats: '34 seats' },
      { name: '3A', status: 'avail', seats: '67 seats' }
    ]
  },
  {
    name: 'Garib Rath Express',
    number: '12215',
    from: 'NDLS',
    to: 'BDTS',
    dep: '08:55',
    arr: '07:35',
    duration: '22h 40m',
    days: [1, 1, 1, 0, 1, 1, 0],
    classes: [
      { name: '3A', status: 'avail', seats: '120 seats' },
      { name: 'CC', status: 'avail', seats: '45 seats' }
    ]
  }
];

const mockFlights = [
  {
    airline: 'Air India',
    number: 'AI-101',
    logo: '\u2708\uFE0F',
    from: 'DEL',
    to: 'BOM',
    dep: '06:30',
    arr: '08:45',
    duration: '2h 15m',
    stops: 'Non-stop',
    price: '\u20B94,250'
  },
  {
    airline: 'IndiGo',
    number: '6E-234',
    logo: '\uD83D\uDEEB',
    from: 'DEL',
    to: 'BOM',
    dep: '09:15',
    arr: '11:30',
    duration: '2h 15m',
    stops: 'Non-stop',
    price: '\u20B93,890'
  },
  {
    airline: 'Vistara',
    number: 'UK-856',
    logo: '\uD83D\uDEA9',
    from: 'DEL',
    to: 'BOM',
    dep: '14:00',
    arr: '16:20',
    duration: '2h 20m',
    stops: 'Non-stop',
    price: '\u20B95,100'
  },
  {
    airline: 'SpiceJet',
    number: 'SG-123',
    logo: '\uD83D\uDE80',
    from: 'DEL',
    to: 'BOM',
    dep: '18:45',
    arr: '21:10',
    duration: '2h 25m',
    stops: 'Non-stop',
    price: '\u20B93,450'
  },
  {
    airline: 'Akasa Air',
    number: 'QP-456',
    logo: '\uD83D\uDEEC',
    from: 'DEL',
    to: 'BOM',
    dep: '20:30',
    arr: '22:55',
    duration: '2h 25m',
    stops: 'Non-stop',
    price: '\u20B93,200'
  }
];

const mockHotels = [
  {
    name: 'Taj Mahal Palace',
    location: 'Colaba, Mumbai',
    rating: 4.8,
    reviews: 3420,
    price: '\u20B918,500',
    discount: '25% OFF',
    amenities: ['Free WiFi', 'Pool', 'Spa', 'Gym'],
    emoji: '\uD83C\uDFE8'
  },
  {
    name: 'The Oberoi',
    location: 'Nariman Point, Mumbai',
    rating: 4.7,
    reviews: 2890,
    price: '\u20B915,200',
    discount: '20% OFF',
    amenities: ['Free WiFi', 'Pool', 'Restaurant', 'Bar'],
    emoji: '\uD83C\uDFE9'
  },
  {
    name: 'ITC Grand Central',
    location: 'Parel, Mumbai',
    rating: 4.5,
    reviews: 2100,
    price: '\u20B99,800',
    discount: '30% OFF',
    amenities: ['Free WiFi', 'Pool', 'Business Center'],
    emoji: '\uD83C\uDFE2'
  },
  {
    name: 'Trident Nariman Point',
    location: 'Nariman Point, Mumbai',
    rating: 4.6,
    reviews: 1850,
    price: '\u20B912,400',
    discount: '15% OFF',
    amenities: ['Free WiFi', 'Pool', 'Spa', 'Sea View'],
    emoji: '\uD83C\uDF0A'
  },
  {
    name: 'FabHotel Prime',
    location: 'Andheri East, Mumbai',
    rating: 4.2,
    reviews: 980,
    price: '\u20B93,200',
    discount: '40% OFF',
    amenities: ['Free WiFi', 'AC', 'Breakfast'],
    emoji: '\uD83D\uDECF\uFE0F'
  },
  {
    name: 'Lemon Tree Premier',
    location: 'Andheri West, Mumbai',
    rating: 4.3,
    reviews: 1450,
    price: '\u20B95,600',
    discount: '35% OFF',
    amenities: ['Free WiFi', 'Pool', 'Restaurant'],
    emoji: '\uD83C\uDF4B'
  }
];

// ============================================
// SEARCH FUNCTIONS
// ============================================

function searchTrains() {
  const btn = document.getElementById('trainSearchBtn');
  const from = document.getElementById('trainFrom').value.split('(')[0].trim();
  const to = document.getElementById('trainTo').value.split('(')[0].trim();
  const date = document.getElementById('trainDate').value;

  btn.classList.add('loading');

  setTimeout(() => {
    btn.classList.remove('loading');

    const resultsSection = document.getElementById('trainResults');
    const resultsRoute = document.getElementById('trainResultsRoute');
    const resultsCount = document.getElementById('trainResultsCount');
    const trainsList = document.getElementById('trainsList');

    resultsRoute.textContent = from + ' \u2192 ' + to;
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    resultsCount.textContent = mockTrains.length + ' trains found for ' + dateStr;

    trainsList.innerHTML = mockTrains.map((train, i) => {
      const daysHtml = train.days.map((d, idx) => {
        return '<span class="day-pill ' + (d ? 'active' : 'inactive') + '">' + dayNames[idx] + '</span>';
      }).join('');

      const classesHtml = train.classes.map(c => {
        const statusClass = c.status === 'avail' ? 'available' : '';
        return '<div class="class-tag ' + statusClass + '"><div class="class-name">' + c.name + '</div><div class="class-status status-' + c.status + '">' + c.seats + '</div></div>';
      }).join('');

      return '<div class="train-card animate-in" style="animation-delay: ' + (i * 0.1) + 's">' +
        '<div class="train-header">' +
          '<div>' +
            '<div class="train-name">' + train.name + '</div>' +
            '<div class="train-number">#' + train.number + ' &bull; Runs on: ' + train.days.map((d, idx) => d ? dayNames[idx] : '<span style="color:#cbd5e1">' + dayNames[idx] + '</span>').join(' ') + '</div>' +
          '</div>' +
          '<div class="train-days">' + daysHtml + '</div>' +
        '</div>' +
        '<div class="train-timeline">' +
          '<div class="time-block"><div class="time">' + train.dep + '</div><div class="station">' + train.from + '</div></div>' +
          '<div class="timeline-line"><span class="duration">' + train.duration + '</span></div>' +
          '<div class="time-block"><div class="time">' + train.arr + '</div><div class="station">' + train.to + '</div></div>' +
        '</div>' +
        '<div class="train-classes">' + classesHtml + '</div>' +
        '<div class="train-actions"><button class="btn btn-primary btn-sm" onclick="startSeatBooking(' + i + ')">Book Now</button></div>' +
      '</div>';
    }).join('');

    resultsSection.classList.add('active');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 1200);
}

function searchFlights() {
  const btn = document.getElementById('flightSearchBtn');
  const from = document.getElementById('flightFrom').value.split('(')[0].trim();
  const to = document.getElementById('flightTo').value.split('(')[0].trim();
  const date = document.getElementById('flightDate').value;

  btn.classList.add('loading');

  setTimeout(() => {
    btn.classList.remove('loading');

    const resultsSection = document.getElementById('flightResults');
    const resultsRoute = document.getElementById('flightResultsRoute');
    const resultsCount = document.getElementById('flightResultsCount');
    const flightsList = document.getElementById('flightsList');

    resultsRoute.textContent = from + ' \u2192 ' + to;
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    resultsCount.textContent = mockFlights.length + ' flights found for ' + dateStr;

    flightsList.innerHTML = mockFlights.map((flight, i) => {
      return '<div class="flight-card animate-in" style="animation-delay: ' + (i * 0.1) + 's">' +
        '<div class="flight-airline">' +
          '<div class="airline-logo">' + flight.logo + '</div>' +
          '<div>' +
            '<div class="airline-name">' + flight.airline + '</div>' +
            '<div class="airline-number">' + flight.number + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flight-timeline">' +
          '<div class="flight-time-block">' +
            '<div class="flight-time">' + flight.dep + '</div>' +
            '<div class="flight-city">' + flight.from + '</div>' +
          '</div>' +
          '<div class="flight-line">' +
            '<span class="flight-duration">' + flight.duration + '</span>' +
            '<span class="flight-stops">' + flight.stops + '</span>' +
          '</div>' +
          '<div class="flight-time-block">' +
            '<div class="flight-time">' + flight.arr + '</div>' +
            '<div class="flight-city">' + flight.to + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flight-price-section">' +
          '<div class="flight-price">' + flight.price + '</div>' +
          '<div class="flight-price-per">per adult</div>' +
          '<button class="btn btn-primary btn-sm" style="margin-top:8px">Book Now</button>' +
        '</div>' +
      '</div>';
    }).join('');

    resultsSection.classList.add('active');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 1200);
}

function searchHotels() {
  const btn = document.getElementById('hotelSearchBtn');
  const city = document.getElementById('hotelCity').value;
  const checkIn = document.getElementById('hotelCheckIn').value;
  const checkOut = document.getElementById('hotelCheckOut').value;

  btn.classList.add('loading');

  setTimeout(() => {
    btn.classList.remove('loading');

    const resultsSection = document.getElementById('hotelResults');
    const resultsRoute = document.getElementById('hotelResultsRoute');
    const resultsCount = document.getElementById('hotelResultsCount');
    const hotelsList = document.getElementById('hotelsList');

    resultsRoute.textContent = 'Hotels in ' + city;
    resultsCount.textContent = mockHotels.length + ' properties found';

    hotelsList.innerHTML = mockHotels.map((hotel, i) => {
      const stars = Array(5).fill(0).map((_, idx) => {
        return '<span class="star ' + (idx < Math.floor(hotel.rating) ? '' : 'empty') + '">\u2605</span>';
      }).join('');

      const amenitiesHtml = hotel.amenities.map(a => '<span class="amenity-tag">' + a + '</span>').join('');

      return '<div class="hotel-card animate-in" style="animation-delay: ' + (i * 0.1) + 's">' +
        '<div class="hotel-image">' +
          hotel.emoji +
          '<span class="hotel-badge badge-discount">' + hotel.discount + '</span>' +
          '<span class="hotel-rating">\u2605 ' + hotel.rating + '</span>' +
        '</div>' +
        '<div class="hotel-content">' +
          '<div class="star-rating">' + stars + '</div>' +
          '<div class="hotel-name">' + hotel.name + '</div>' +
          '<div class="hotel-location">\uD83D\uDCCD ' + hotel.location + '</div>' +
          '<div class="hotel-amenities">' + amenitiesHtml + '</div>' +
          '<div class="hotel-footer">' +
            '<div class="hotel-price">' + hotel.price + '<span>/night</span></div>' +
            '<button class="btn btn-primary btn-sm">View Deal</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    resultsSection.classList.add('active');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 1200);
}

// ============================================
// FILTER BUTTONS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const parent = this.closest('.filter-bar');
      if (parent) {
        parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      }
      this.classList.add('active');
    });
  });
});