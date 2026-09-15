// ============================================
// IRCTC Redesign - Main JavaScript
// ============================================

const LIVE_RAIL_API = {
  pnr: '/api/railway/pnr',
  running: '/api/railway/running'
};


function showService(service) {
  const target = service === 'pnr' ? 'pnrPanel' : service === 'running' ? 'runningPanel' : service === 'holidays' ? 'holidaySection' : 'visaSection';
  const element = document.getElementById(target);
  if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function fetchRailStatus(endpoint, params) {
  if (window.location.protocol === 'file:') throw new Error('Local preview has no live API');
  const query = new URLSearchParams(params);
  const response = await fetch(`${endpoint}?${query}`);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : { message: await response.text() };
  if (!response.ok) throw new Error(data.error || data.message || `Railway service unavailable (HTTP ${response.status})`);
  return data;
}

function checkPNR(event) {
  event.preventDefault();
  const pnr = document.getElementById('pnrNumber').value.trim();
  const result = document.getElementById('pnrResult');
  result.innerHTML = '<span class="loading-text">Checking latest PNR status...</span>';
  fetchRailStatus(LIVE_RAIL_API.pnr, { pnr }).then(data => {
    const status = data.status || data.pnrStatus || data.PNRStatus || data.response?.[0]?.PNRStatus || 'Confirmed';
    result.innerHTML = `<strong>${status}</strong><span>Live result for PNR ${pnr}</span>`;
  }).catch(() => {
    result.innerHTML = `<strong>Demo result: Chart not prepared</strong><span>PNR ${pnr} is ready for live lookup after the railway API is connected.</span><small>Demo data only</small>`;
  });
}

function checkRunningStatus(event) {
  event.preventDefault();
  const trainNumber = document.getElementById('runningTrainNumber').value.trim();
  const date = document.getElementById('runningDate').value;
  const result = document.getElementById('runningResult');
  result.innerHTML = '<span class="loading-text">Finding the train...</span>';
  fetchRailStatus(LIVE_RAIL_API.running, { trainNumber, date }).then(data => {
    const station = data.currentStation ? `${data.currentStation}${data.currentStationCode ? ` (${data.currentStationCode})` : ''}` : 'Current location unavailable';
    const delay = data.delay ? ` · Delay: ${data.delay}${/^\d+$/.test(String(data.delay)) ? ' minutes' : ''}` : '';
    const updated = data.lastUpdated ? `Updated: ${data.lastUpdated}` : `Journey date: ${date}`;
    result.innerHTML = `<strong>${data.trainName ? `${data.trainName} · ` : ''}${data.status || 'Running status received'}</strong><span>${station}${delay}</span><small>${updated}</small>`;
  }).catch(error => {
    const message = error.message || 'The railway service could not be reached.';
    const setupHint = message.toLowerCase().includes('api key')
      ? 'Add INDIAN_RAIL_API_KEY to .env and restart the backend.'
      : 'Check the train number, date, server and railway provider availability.';
    result.innerHTML = `<strong>Running status unavailable</strong><span>${message}</span><small>${setupHint}</small>`;
  });
}

const visaGuides = {
  UAE: {
    title: 'Dubai / UAE tourist visa',
    subtitle: 'Typical visitor visa process for Indian travellers',
    steps: ['Check passport validity, photo and return-ticket requirements.', 'Choose an approved airline, hotel, travel agent or UAE sponsor to submit the application.', 'Upload passport, photo, travel dates, hotel booking and other requested documents.', 'Pay the current visa fee and track the application using the provider reference.', 'Download the approved e-visa and carry it with your passport for airline check-in and arrival.'],
    link: 'https://u.ae/en/information-and-services/visa-and-emirates-id'
  },
  Thailand: {
    title: 'Thailand tourist visa',
    subtitle: 'Typical e-visa preparation and entry process',
    steps: ['Confirm whether your passport and travel dates require a visa or qualify for a current exemption.', 'Create an account on the official Thai e-Visa portal and select the correct visa type.', 'Upload passport, photograph, itinerary, accommodation and financial documents.', 'Pay the current fee and monitor email for approval or clarification requests.', 'Print or save the approval letter and present it with passport and onward-travel proof at entry.'],
    link: 'https://www.thaievisa.go.th/'
  },
  Singapore: {
    title: 'Singapore tourist visa',
    subtitle: 'Typical application process for Indian travellers',
    steps: ['Check passport validity and prepare a recent photograph, return ticket and accommodation details.', 'Submit the application through an authorised Singapore visa agent or approved local contact.', 'Provide the completed form, passport copy, itinerary and financial or employment documents if requested.', 'Pay the current processing fee and wait for the outcome, usually sent electronically.', 'Carry the approved e-visa, passport, return ticket and proof of funds for arrival checks.'],
    link: 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore/visa_requirements'
  },
  Malaysia: {
    title: 'Malaysia tourist entry',
    subtitle: 'Typical preparation for Indian travellers',
    steps: ['Check current visa or eVisa eligibility for your passport and travel dates.', 'Create an application on the official Malaysian immigration portal if a visa is required.', 'Upload passport, photograph, return ticket, accommodation and financial documents.', 'Pay the current fee and save the approved eVisa or entry confirmation.', 'Carry passport, accommodation proof, return ticket and sufficient funds for arrival checks.'],
    link: 'https://malaysiavisa.imi.gov.my/'
  },
  'Sri Lanka': {
    title: 'Sri Lanka tourist ETA',
    subtitle: 'Electronic travel authorisation preparation',
    steps: ['Check passport validity and confirm the current ETA rules for your nationality.', 'Open the official Sri Lanka ETA portal and choose the tourism category.', 'Enter passport, travel, accommodation and contact details accurately.', 'Pay the current ETA fee and save the approval reference or email.', 'Carry the ETA approval, passport, return ticket and hotel details at immigration.'],
    link: 'https://eta.gov.lk/slvisa/'
  },
  Maldives: {
    title: 'Maldives tourist arrival',
    subtitle: 'Arrival visa and travel preparation guide',
    steps: ['Confirm passport validity, return ticket and confirmed accommodation before travel.', 'Complete the required traveller declaration through the official Maldives immigration channel.', 'Keep hotel booking, return ticket and proof of funds ready for inspection.', 'Receive the tourist arrival visa decision at immigration on arrival, subject to current rules.', 'Follow the permitted stay period and retain your travel documents during the trip.'],
    link: 'https://immigration.gov.mv/tourist-visa/'
  }
};

function openVisaGuide(country) {
  const guide = visaGuides[country];
  if (!guide) return;
  document.getElementById('visaGuideTitle').textContent = guide.title;
  document.getElementById('visaGuideSubtitle').textContent = guide.subtitle;
  document.getElementById('visaGuideSteps').innerHTML = guide.steps.map(step => `<li>${step}</li>`).join('');
  document.getElementById('visaOfficialLink').href = guide.link;
  document.getElementById('visaOverlay').style.display = 'flex';
}

function closeVisaGuide() {
  document.getElementById('visaOverlay').style.display = 'none';
}

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
  bookingType: 'train',
  selectedTrain: null,
  selectedFlight: null,
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

const hotelBookingState = {
  hotel: null,
  city: '',
  checkIn: '',
  checkOut: '',
  guests: 2,
  rooms: 1,
  guestName: '',
  mobile: '',
  email: '',
  request: '',
  paymentMethod: 'UPI'
};

function startHotelBooking(index, city) {
  const hotel = getHotelsForCity(city)[index];
  hotelBookingState.hotel = hotel;
  hotelBookingState.city = city;
  hotelBookingState.checkIn = document.getElementById('hotelCheckIn').value;
  hotelBookingState.checkOut = document.getElementById('hotelCheckOut').value;
  hotelBookingState.guests = Number(document.getElementById('guestCount').textContent) || 2;
  hotelBookingState.rooms = Number(document.getElementById('roomCount').textContent) || 1;
  document.getElementById('hotelBookingOverlay').style.display = 'flex';
  renderHotelBooking();
}

function renderHotelBooking() {
  const state = hotelBookingState;
  const hotel = state.hotel;
  if (!hotel) return;
  document.getElementById('hotelBookingName').textContent = hotel.name;
  document.getElementById('hotelBookingLocation').textContent = hotel.location;
  document.getElementById('hotelBookingImage').src = hotel.image;
  document.getElementById('hotelBookingCheckIn').textContent = state.checkIn;
  document.getElementById('hotelBookingCheckOut').textContent = state.checkOut;
  document.getElementById('hotelBookingGuests').textContent = `${state.guests} guests, ${state.rooms} room${state.rooms > 1 ? 's' : ''}`;
  document.getElementById('hotelGuestName').value = state.guestName;
  document.getElementById('hotelGuestMobile').value = state.mobile;
  document.getElementById('hotelGuestEmail').value = state.email;
  document.getElementById('hotelSpecialRequest').value = state.request;
  document.getElementById('hotelPaymentMethod').value = state.paymentMethod;
}

function closeHotelBooking() {
  document.getElementById('hotelBookingOverlay').style.display = 'none';
}

function confirmHotelBooking(event) {
  event.preventDefault();
  const state = hotelBookingState;
  state.guestName = document.getElementById('hotelGuestName').value.trim();
  state.mobile = document.getElementById('hotelGuestMobile').value.trim();
  state.email = document.getElementById('hotelGuestEmail').value.trim();
  state.request = document.getElementById('hotelSpecialRequest').value.trim();
  state.paymentMethod = document.getElementById('hotelPaymentMethod').value;
  if (new Date(state.checkOut) <= new Date(state.checkIn)) {
    alert('Check-out date must be after check-in date.');
    return;
  }
  if (!document.getElementById('hotelAcceptTerms').checked) {
    alert('Please accept the hotel booking terms and cancellation policy.');
    return;
  }
  const nights = Math.max(1, Math.ceil((new Date(state.checkOut) - new Date(state.checkIn)) / 86400000));
  const nightlyFare = Number(state.hotel.price.replace(/[^0-9]/g, ''));
  bookingState.bookingType = 'hotel';
  bookingState.confirmedTicket = {
    ticketNumber: `CBH-${Date.now().toString().slice(-8)}`,
    bookingType: 'hotel',
    booking: state.hotel,
    travelClass: `${nights} night${nights > 1 ? 's' : ''}`,
    passengerName: state.guestName,
    passengerAge: 'Adult',
    passengerGender: 'Guest',
    seatCount: state.rooms,
    paymentText: state.paymentMethod,
    total: nightlyFare * nights * state.rooms * 1.17,
    stay: state
  };
  closeHotelBooking();
  renderTicket();
  saveBooking(bookingState.confirmedTicket);
}

function startSeatBooking(index) {
  const train = mockTrains[index];
  bookingState.bookingType = 'train';
  bookingState.selectedTrain = train;
  bookingState.selectedFlight = null;
  bookingState.selectedClass = train.classes[0]?.name || '3A';
  resetBookingState();
  document.getElementById('bookingOverlay').style.display = 'flex';
  renderBookingStep();
}

function startFlightBooking(index) {
  const flight = mockFlights[index];
  bookingState.bookingType = 'flight';
  bookingState.selectedTrain = null;
  bookingState.selectedFlight = flight;
  bookingState.selectedClass = 'Economy';
  resetBookingState();
  document.getElementById('bookingOverlay').style.display = 'flex';
  renderBookingStep();
}

function resetBookingState() {
  bookingState.seatCount = 1;
  bookingState.passengerName = '';
  bookingState.passengerType = 'adult';
  bookingState.passengerAge = '';
  bookingState.passengerGender = 'male';
  bookingState.paymentMethod = 'netbanking';
  bookingState.netBank = 'HDFC';
  bookingState.upiMethod = 'Google Pay';
  bookingState.step = 1;
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
  const priceInfo = document.getElementById('bookingPriceInfo');
  const gstAmount = document.getElementById('bookingGST');
  const serviceTax = document.getElementById('bookingServiceTax');
  const totalSummary = document.getElementById('bookingTotalSummary');
  const termsText = document.getElementById('bookingTermsText');

  const isFlight = bookingState.bookingType === 'flight';
  const booking = isFlight ? bookingState.selectedFlight : bookingState.selectedTrain;
  if (!booking) return;

  trainName.textContent = isFlight ? `${booking.airline} ${booking.number}` : `${booking.name} #${booking.number}`;
  trainRoute.textContent = `${booking.from} → ${booking.to}`;
  const classOptions = isFlight ? ['Economy', 'Premium Economy', 'Business', 'First'] : booking.classes.map(c => c.name);
  classSelect.innerHTML = classOptions.map(className => `<option value="${className}" ${className === bookingState.selectedClass ? 'selected' : ''}>${className}</option>`).join('');
  seatCounter.textContent = bookingState.seatCount;

  const baseFare = isFlight ? getFlightFare(booking) : getClassFare(bookingState.selectedClass);
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
  priceInfo.textContent = `${isFlight ? 'Fare per traveller' : 'Fare per seat'}: ₹${baseFare} × ${bookingState.seatCount} = ₹${subtotal}`;
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

  const classLabel = document.getElementById('bookingClassLabel');
  const seatLabel = document.getElementById('bookingSeatsLabel');
  if (classLabel) classLabel.textContent = isFlight ? 'Cabin Class' : 'Choose Class';
  if (seatLabel) seatLabel.textContent = isFlight ? 'Travellers' : 'Seats';
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
  const booking = bookingState.bookingType === 'flight' ? bookingState.selectedFlight : bookingState.selectedTrain;
  const paymentMethod = formatPaymentMethod(bookingState.paymentMethod);
  let paymentText = paymentMethod;
  if (bookingState.paymentMethod === 'netbanking') {
    paymentText += ` (${bookingState.netBank})`;
  } else if (bookingState.paymentMethod === 'upi') {
    paymentText += ` (${bookingState.upiMethod})`;
  }

  bookingState.confirmedTicket = {
    ticketNumber: `CBT-${Date.now().toString().slice(-8)}`,
    bookingType: bookingState.bookingType,
    booking,
    travelClass: bookingState.selectedClass,
    passengerName: bookingState.passengerName,
    passengerType: bookingState.passengerType,
    passengerAge: bookingState.passengerAge,
    passengerGender: bookingState.passengerGender,
    seatCount: bookingState.seatCount,
    paymentText,
    total: getBookingTotal()
  };
  closeBooking();
  renderTicket();
  saveBooking(bookingState.confirmedTicket);
}

function saveBooking(ticket) {
  const booking = ticket.booking;
  const route = ticket.bookingType === 'hotel' ? booking.location : `${booking.from} → ${booking.to}`;
  fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticketNumber: ticket.ticketNumber,
      bookingType: ticket.bookingType,
      passengerName: ticket.passengerName,
      route,
      booking: ticket
    })
  }).catch(() => {
  });
}

function getFlightFare(flight) {
  return Number(flight.price.replace(/[^0-9]/g, '')) || 0;
}

function getBookingTotal() {
  const booking = bookingState.bookingType === 'flight' ? bookingState.selectedFlight : bookingState.selectedTrain;
  const baseFare = bookingState.bookingType === 'flight' ? getFlightFare(booking) : getClassFare(bookingState.selectedClass);
  const subtotal = baseFare * bookingState.seatCount;
  return subtotal + Math.round(subtotal * 0.05) + Math.round(subtotal * 0.12);
}

function renderTicket() {
  const ticket = bookingState.confirmedTicket;
  if (!ticket) return;
  const booking = ticket.booking;
  const isHotel = ticket.bookingType === 'hotel';
  document.getElementById('ticketNumber').textContent = ticket.ticketNumber;
  document.getElementById('ticketType').textContent = isHotel ? 'Hotel booking' : ticket.bookingType === 'flight' ? 'Flight ticket' : 'Train ticket';
  document.getElementById('ticketOperator').textContent = isHotel ? booking.name : ticket.bookingType === 'flight' ? `${booking.airline} ${booking.number}` : `${booking.name} #${booking.number}`;
  document.getElementById('ticketRoute').textContent = isHotel ? booking.location : `${booking.from} → ${booking.to}`;
  document.getElementById('ticketClass').textContent = ticket.travelClass;
  document.getElementById('ticketPassenger').textContent = isHotel ? `${ticket.passengerName} · ${ticket.stay.mobile}` : `${ticket.passengerName} (${ticket.passengerAge}, ${ticket.passengerGender})`;
  document.getElementById('ticketTravellers').textContent = ticket.seatCount;
  document.getElementById('ticketPayment').textContent = ticket.paymentText;
  document.getElementById('ticketTotal').textContent = `₹${ticket.total}`;
  document.getElementById('ticketOverlay').style.display = 'flex';
}

function closeTicket() {
  document.getElementById('ticketOverlay').style.display = 'none';
}

function downloadTicket() {
  const ticket = bookingState.confirmedTicket;
  if (!ticket) return;
  const booking = ticket.booking;
  const isHotel = ticket.bookingType === 'hotel';
  const ticketType = isHotel ? 'Hotel' : ticket.bookingType === 'flight' ? 'Flight' : 'Train';
  const journey = isHotel ? `${ticket.stay.checkIn} to ${ticket.stay.checkOut}` : `${booking.from} &rarr; ${booking.to}`;
  const operator = isHotel ? `${booking.name} · ${booking.location}` : ticket.bookingType === 'flight' ? booking.airline + ' ' + booking.number : booking.name + ' #' + booking.number;
  const ticketHtml = `<!doctype html><html><head><meta charset="UTF-8"><title>${ticketType} Ticket ${ticket.ticketNumber}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#0f172a}main{max-width:680px;margin:auto;border:1px solid #dbeafe;border-radius:16px;padding:24px}h1{color:#2563eb}p{padding:8px 0;border-bottom:1px solid #e2e8f0}</style></head><body><main><h1>Cheap &amp; Best Trip</h1><p><strong>${ticketType}:</strong> ${ticket.ticketNumber}</p><p><strong>Booking:</strong> ${operator}</p><p><strong>Travel / stay:</strong> ${journey}</p><p><strong>Guest:</strong> ${ticket.passengerName}</p><p><strong>Plan:</strong> ${ticket.travelClass}</p><p><strong>Rooms / travellers:</strong> ${ticket.seatCount}</p><p><strong>Payment:</strong> ${ticket.paymentText}</p><p><strong>Total paid:</strong> ₹${Math.round(ticket.total)}</p></main></body></html>`;
  const blob = new Blob([ticketHtml], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${ticketType.toLowerCase()}-ticket-${ticket.ticketNumber}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
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
    logoUrl: 'https://www.gstatic.com/flights/airline_logos/70px/AI.png',
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
    logoUrl: 'https://www.gstatic.com/flights/airline_logos/70px/6E.png',
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
    logoUrl: 'https://www.gstatic.com/flights/airline_logos/70px/UK.png',
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
    logoUrl: 'https://www.gstatic.com/flights/airline_logos/70px/SG.png',
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
    logoUrl: 'https://www.gstatic.com/flights/airline_logos/70px/QP.png',
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
    emoji: '\uD83C\uDFE8',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'The Oberoi',
    location: 'Nariman Point, Mumbai',
    rating: 4.7,
    reviews: 2890,
    price: '\u20B915,200',
    discount: '20% OFF',
    amenities: ['Free WiFi', 'Pool', 'Restaurant', 'Bar'],
    emoji: '\uD83C\uDFE9',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'ITC Grand Central',
    location: 'Parel, Mumbai',
    rating: 4.5,
    reviews: 2100,
    price: '\u20B99,800',
    discount: '30% OFF',
    amenities: ['Free WiFi', 'Pool', 'Business Center'],
    emoji: '\uD83C\uDFE2',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'Trident Nariman Point',
    location: 'Nariman Point, Mumbai',
    rating: 4.6,
    reviews: 1850,
    price: '\u20B912,400',
    discount: '15% OFF',
    amenities: ['Free WiFi', 'Pool', 'Spa', 'Sea View'],
    emoji: '\uD83C\uDF0A',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'FabHotel Prime',
    location: 'Andheri East, Mumbai',
    rating: 4.2,
    reviews: 980,
    price: '\u20B93,200',
    discount: '40% OFF',
    amenities: ['Free WiFi', 'AC', 'Breakfast'],
    emoji: '\uD83D\uDECF\uFE0F',
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'Lemon Tree Premier',
    location: 'Andheri West, Mumbai',
    rating: 4.3,
    reviews: 1450,
    price: '\u20B95,600',
    discount: '35% OFF',
    amenities: ['Free WiFi', 'Pool', 'Restaurant'],
    emoji: '\uD83C\uDF4B',
    image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=85'
  }
];

const hotelCityProfiles = {
  mumbai: { name: 'Mumbai', locations: ['Colaba', 'Nariman Point', 'Parel', 'Andheri East', 'Bandra West', 'Powai'], names: ['Taj Mahal Palace', 'The Oberoi Mumbai', 'ITC Grand Central', 'Trident Nariman Point', 'FabHotel Prime Mumbai', 'Lemon Tree Premier Mumbai'] },
  delhi: { name: 'Delhi', locations: ['Connaught Place', 'Aerocity', 'Saket', 'Karol Bagh', 'Hauz Khas', 'Dwarka'], names: ['The Imperial New Delhi', 'Andaz Delhi', 'The Leela Palace', 'Shangri-La Eros', 'Bloomrooms Janpath', 'Lemon Tree Premier Delhi'] },
  bangalore: { name: 'Bangalore', locations: ['MG Road', 'Whitefield', 'Koramangala', 'Indiranagar', 'Hebbal', 'Electronic City'], names: ['The Oberoi Bengaluru', 'ITC Gardenia', 'Taj MG Road', 'The Leela Palace Bengaluru', 'Bloomrooms Indiranagar', 'Lemon Tree Bengaluru'] },
  noida: { name: 'Noida', locations: ['Sector 18', 'Sector 62', 'Noida Expressway', 'Film City', 'Sector 38', 'Greater Noida'], names: ['Radisson Blu Noida', 'Crowne Plaza Noida', 'Sandal Suites Noida', 'Savoy Suites Noida', 'Ginger Noida', 'Hotel Noida Grand'] },
  lucknow: { name: 'Lucknow', locations: ['Hazratganj', 'Gomti Nagar', 'Aliganj', 'Charbagh', 'Sushant Golf City', 'Indira Nagar'], names: ['Taj Mahal Lucknow', 'Hyatt Regency Lucknow', 'Renaissance Lucknow', 'Clarks Avadh', 'Ginger Lucknow', 'The Piccadily Lucknow'] },
  hyderabad: { name: 'Hyderabad', locations: ['Banjara Hills', 'Hitech City', 'Gachibowli', 'Jubilee Hills', 'Begumpet', 'Secunderabad'], names: ['Taj Falaknuma Palace', 'Trident Hyderabad', 'ITC Kohenur', 'Park Hyatt Hyderabad', 'The Manohar Hyderabad', 'Lemon Tree Hyderabad'] },
  chennai: { name: 'Chennai', locations: ['T Nagar', 'OMR', 'Adyar', 'Guindy', 'Egmore', 'Nungambakkam'], names: ['ITC Grand Chola', 'The Leela Palace Chennai', 'Taj Coromandel', 'Hyatt Regency Chennai', 'The Residency Chennai', 'Lemon Tree Chennai'] },
  kolkata: { name: 'Kolkata', locations: ['Park Street', 'Salt Lake', 'New Town', 'Ballygunge', 'Rajarhat', 'Esplanade'], names: ['The Oberoi Grand Kolkata', 'ITC Royal Bengal', 'The Westin Kolkata', 'Taj Bengal', 'The Peerless Inn Kolkata', 'Lemon Tree Kolkata'] }
};

function getHotelsForCity(city) {
  const key = city.toLowerCase().trim();
  const profile = hotelCityProfiles[key] || { name: city.trim() || 'Mumbai', locations: ['City Centre', 'Central District', 'Airport Area', 'Old Town', 'Business District', 'Downtown'], names: ['Grand Central Hotel', 'City Palace Hotel', 'The Residency', 'Royal Gateway Hotel', 'Comfort Suites', 'Lemon Tree Premier'] };
  return mockHotels.map((hotel, index) => ({
    ...hotel,
    name: profile.names[index],
    location: `${profile.locations[index]}, ${profile.name}`
  }));
}

function getAirportCode(value) {
  const code = value.match(/\(([A-Z]{3})\)/i);
  return code ? code[1].toUpperCase() : value.trim().slice(0, 3).toUpperCase();
}

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
  const fromCode = getAirportCode(document.getElementById('flightFrom').value);
  const toCode = getAirportCode(document.getElementById('flightTo').value);
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
      const routeFlight = { ...flight, from: fromCode, to: toCode };
      return '<div class="flight-card animate-in" style="animation-delay: ' + (i * 0.1) + 's">' +
        '<div class="flight-airline">' +
          '<div class="airline-logo"><img src="' + flight.logoUrl + '" alt="' + flight.airline + ' logo" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'block\';"><span class="airline-logo-fallback">' + flight.logo + '</span></div>' +
          '<div>' +
            '<div class="airline-name">' + flight.airline + '</div>' +
            '<div class="airline-number">' + flight.number + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flight-timeline">' +
          '<div class="flight-time-block">' +
            '<div class="flight-time">' + routeFlight.dep + '</div>' +
            '<div class="flight-city">' + routeFlight.from + '</div>' +
          '</div>' +
          '<div class="flight-line">' +
            '<span class="flight-duration">' + flight.duration + '</span>' +
            '<span class="flight-stops">' + flight.stops + '</span>' +
          '</div>' +
          '<div class="flight-time-block">' +
            '<div class="flight-time">' + routeFlight.arr + '</div>' +
            '<div class="flight-city">' + routeFlight.to + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flight-price-section">' +
          '<div class="flight-price">' + flight.price + '</div>' +
          '<div class="flight-price-per">per adult</div>' +
          '<button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="startFlightBooking(' + i + ')">Book Now</button>' +
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
  const cityHotels = getHotelsForCity(city);

  btn.classList.add('loading');

  setTimeout(() => {
    btn.classList.remove('loading');

    const resultsSection = document.getElementById('hotelResults');
    const resultsRoute = document.getElementById('hotelResultsRoute');
    const resultsCount = document.getElementById('hotelResultsCount');
    const hotelsList = document.getElementById('hotelsList');

    resultsRoute.textContent = 'Hotels in ' + city;
    resultsCount.textContent = cityHotels.length + ' properties found in ' + city;

    hotelsList.innerHTML = cityHotels.map((hotel, i) => {
      const safeCity = city.trim().replace(/'/g, '');
      const stars = Array(5).fill(0).map((_, idx) => {
        return '<span class="star ' + (idx < Math.floor(hotel.rating) ? '' : 'empty') + '">\u2605</span>';
      }).join('');

      const amenitiesHtml = hotel.amenities.map(a => '<span class="amenity-tag">' + a + '</span>').join('');

      return '<div class="hotel-card animate-in" style="animation-delay: ' + (i * 0.1) + 's">' +
        '<div class="hotel-image"><img src="' + hotel.image + '" alt="' + hotel.name + ' hotel" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'grid\';"><span class="hotel-image-fallback">' + hotel.emoji + '</span>' +
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
            '<button class="btn btn-primary btn-sm" onclick="startHotelBooking(' + i + ', \'' + safeCity + '\')">Book Now</button>' +
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
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const formatDateInput = date => date.toISOString().split('T')[0];
  const dateDefaults = [
    ['trainDate', today],
    ['flightDate', today],
    ['hotelCheckIn', today],
    ['hotelCheckOut', tomorrow]
  ];
  dateDefaults.forEach(([id, date]) => {
    const input = document.getElementById(id);
    if (input) {
      input.value = formatDateInput(date);
      input.min = formatDateInput(today);
    }
  });

  const runningDate = document.getElementById('runningDate');
  if (runningDate && !runningDate.value) {
    runningDate.value = formatDateInput(today);
  }
  if (runningDate) runningDate.min = formatDateInput(today);

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