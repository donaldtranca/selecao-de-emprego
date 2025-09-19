// Elementos do formulário
const form = document.getElementById("jobForm")
const clearButton = document.getElementById("clearForm")
const fileInput = document.getElementById("resume")
const fileDisplay = document.querySelector(".file-upload-display span")

// Campos obrigatórios
const requiredFields = ["fullName", "email", "phone", "birthDate", "gender", "password", "acceptTerms"]

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners()
  setupFileUpload()
})

// Configurar event listeners
function setupEventListeners() {
  form.addEventListener("submit", handleSubmit)
  clearButton.addEventListener("click", clearForm)

  // Limpar erros quando o usuário começar a digitar
  requiredFields.forEach((fieldName) => {
    const field = document.querySelector(`[name="${fieldName}"]`)
    if (field) {
      if (field.type === "radio") {
        const radioButtons = document.querySelectorAll(`[name="${fieldName}"]`)
        radioButtons.forEach((radio) => {
          radio.addEventListener("change", () => clearError(fieldName))
        })
      } else {
        field.addEventListener("input", () => clearError(fieldName))
        field.addEventListener("change", () => clearError(fieldName))
      }
    }
  })
}

// Configurar upload de arquivo
function setupFileUpload() {
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]

    if (file) {
      if (file.type !== "application/pdf") {
        showError("resume", "Apenas arquivos PDF são aceitos")
        fileInput.value = ""
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        showError("resume", "O arquivo deve ter no máximo 5MB")
        fileInput.value = ""
        return
      }

      fileDisplay.innerHTML = `<i class="fas fa-file-pdf"></i> ${file.name}`
      clearError("resume")
    } else {
      fileDisplay.innerHTML = "Clique para selecionar ou arraste seu currículo em PDF"
    }
  })
}

// Manipular envio do formulário
function handleSubmit(e) {
  e.preventDefault()

  if (validateForm()) {
    const formData = collectFormData()

    // Mostrar loading
    showLoadingMessage()

    // Enviar para Google Sheets
    sendToGoogleSheets(formData)
  }
}

async function sendToGoogleSheets(formData) {
  try {
    // URL do seu Google Apps Script
    const SCRIPT_URL =
      "https://script.google.com/macros/s/AKfycbw4TcOTY4Hj5vzncrKntyulHhCyk7VVIRjgO3V2Kw3nTT6Gt78By2WlD82jsGL7DoWqxQ/exec"

    // Preparar FormData para envio (mais compatível com Google Apps Script)
    const formDataToSend = new FormData()
    formDataToSend.append("fullName", formData.fullName)
    formDataToSend.append("email", formData.email)
    formDataToSend.append("phone", formData.phone)
    formDataToSend.append("birthDate", formData.birthDate)
    formDataToSend.append("gender", formData.gender)
    formDataToSend.append("address", formData.address || "")
    formDataToSend.append("interest", formData.interest || "")
    formDataToSend.append("experience", formData.experience || "")
    formDataToSend.append("education", formData.education || "")
    formDataToSend.append("login", formData.login || "")
    formDataToSend.append("password", formData.password)
    formDataToSend.append("resumeFileName", formData.resumeFile ? formData.resumeFile.name : "")

    console.log("[v0] Enviando dados via FormData")

    // Fazer requisição com timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos timeout

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: formDataToSend,
      signal: controller.signal,
      mode: "no-cors", // Mudando para no-cors para evitar problemas de CORS
    })

    clearTimeout(timeoutId)

    console.log("[v0] Requisição enviada")

    // Com no-cors, não conseguimos ler a resposta, então assumimos sucesso se não houve erro
    showSuccessMessage()

    // Opcional: limpar formulário após envio
    setTimeout(() => {
      if (confirm("Dados enviados com sucesso! Deseja limpar o formulário?")) {
        clearForm()
      }
    }, 1000)
  } catch (error) {
    console.error("[v0] Erro ao enviar dados:", error)

    let errorMessage = "Erro de conexão. Tente novamente."

    if (error.name === "AbortError") {
      errorMessage = "Timeout: A requisição demorou muito para responder."
    }

    showErrorMessage(errorMessage)
  } finally {
    hideLoadingMessage()
  }
}

// Validar formulário
function validateForm() {
  let isValid = true

  // Limpar erros anteriores
  clearAllErrors()

  // Validar campos obrigatórios
  requiredFields.forEach((fieldName) => {
    const field = document.querySelector(`[name="${fieldName}"]`)

    if (fieldName === "gender") {
      const selectedGender = document.querySelector('[name="gender"]:checked')
      if (!selectedGender) {
        showError("gender", "Selecione um gênero")
        isValid = false
      }
    } else if (fieldName === "acceptTerms") {
      if (!field.checked) {
        showError("acceptTerms", "Você deve aceitar os termos e condições")
        isValid = false
      }
    } else if (fieldName === "password") {
      if (!field.value.trim()) {
        showError("password", "Senha é obrigatória")
        isValid = false
      } else if (field.value.length !== 8) {
        showError("password", "A senha deve ter exatamente 8 caracteres")
        isValid = false
      }
    } else {
      if (!field.value.trim()) {
        const fieldLabel = document.querySelector(`label[for="${fieldName}"]`).textContent.replace(" *", "")
        showError(fieldName, `${fieldLabel} é obrigatório`)
        isValid = false
      }
    }
  })

  // Validar email
  const email = document.getElementById("email")
  if (email.value && !isValidEmail(email.value)) {
    showError("email", "Digite um e-mail válido")
    isValid = false
  }

  return isValid
}

// Validar formato de email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Coletar dados do formulário
function collectFormData() {
  const formData = new FormData(form)
  const data = {}

  for (const [key, value] of formData.entries()) {
    data[key] = value
  }

  // Adicionar arquivo se existir
  if (fileInput.files[0]) {
    data.resumeFile = fileInput.files[0]
  }

  return data
}

// Mostrar erro
function showError(fieldName, message) {
  const errorElement = document.getElementById(`${fieldName}-error`)
  const field = document.querySelector(`[name="${fieldName}"]`)

  if (errorElement) {
    errorElement.textContent = message
  }

  if (field && field.type !== "radio" && field.type !== "checkbox") {
    field.classList.add("error")
  }
}

// Limpar erro específico
function clearError(fieldName) {
  const errorElement = document.getElementById(`${fieldName}-error`)
  const field = document.querySelector(`[name="${fieldName}"]`)

  if (errorElement) {
    errorElement.textContent = ""
  }

  if (field && field.type !== "radio" && field.type !== "checkbox") {
    field.classList.remove("error")
  }
}

// Limpar todos os erros
function clearAllErrors() {
  const errorElements = document.querySelectorAll(".error-message")
  const errorFields = document.querySelectorAll(".error")

  errorElements.forEach((element) => {
    element.textContent = ""
  })

  errorFields.forEach((field) => {
    field.classList.remove("error")
  })
}

// Limpar formulário
function clearForm() {
  if (confirm("Tem certeza que deseja limpar todos os campos?")) {
    form.reset()
    clearAllErrors()
    fileDisplay.innerHTML = "Clique para selecionar ou arraste seu currículo em PDF"
  }
}

// Mostrar mensagem de sucesso
function showSuccessMessage() {
  alert(
    "✅ Formulário enviado com sucesso!\n\nSeus dados foram salvos e entraremos em contato em breve.\n\nObrigado por se candidatar!",
  )
}

function showLoadingMessage() {
  const submitButton = document.querySelector('button[type="submit"]')
  submitButton.disabled = true
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...'
}

function hideLoadingMessage() {
  const submitButton = document.querySelector('button[type="submit"]')
  submitButton.disabled = false
  submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Candidatura'
}

function showErrorMessage(message) {
  alert("❌ Erro: " + message + "\n\nTente novamente ou entre em contato conosco se o problema persistir.")
}

// Máscara para telefone (opcional)
document.getElementById("phone").addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "")

  if (value.length <= 11) {
    if (value.length <= 10) {
      value = value.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
    } else {
      value = value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    }
    e.target.value = value
  }
})


