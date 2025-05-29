/**
 * @jest-environment jsdom
 */

import {fireEvent, screen, waitFor, within} from "@testing-library/dom"
import '@testing-library/jest-dom'
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { bills } from "../fixtures/bills.js"
import {ROUTES, ROUTES_PATH} from "../constants/routes.js"
import {localStorageMock} from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import router from "../app/Router.js";
import userEvent from "@testing-library/user-event"
jest.mock("../app/store", () => mockStore)

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  })

  window.localStorage.setItem(
    "user",
    JSON.stringify({
      type: "Employee",
      email: "a@a",
    })
  )
})

beforeEach(() => {
  const root = document.createElement("div")
  root.setAttribute("id", "root")
  document.body.append(root)
  router();
  document.body.innerHTML = NewBillUI()
  window.onNavigate(ROUTES_PATH.NewBill)
})

afterEach(() => {
  jest.resetAllMocks()
  document.body.innerHTML = ""
})


// TESTS UNITAIRES
describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then mail icon in vertical layout should be highlighted", () => {

      waitFor(() => screen.getByTestId('icon-mail'))
      const mailIcon = screen.getByTestId('icon-mail')
      expect(mailIcon).toHaveClass("active-icon")
    })

    describe("When I upload a new file", () => {
      test("Then it should be return true for a valid .jpg/.jpeg file or a valid .png file", () => {
        
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        })
        
        const jpgFile = new File(["content"], "test.jpg", { type: "image/jpeg" })
        expect(newBill.isValidFile(jpgFile)).toBe(true)
        const jpegFile = new File(["content"], "test.jpeg", { type: "image/jpeg" })
        expect(newBill.isValidFile(jpegFile)).toBe(true)
        const pngFile = new File(["content"], "test.png", { type: "image/png" })
        expect(newBill.isValidFile(pngFile)).toBe(true)

      })

      test("Then it should return false for invalid file type (.pdf)", () => {
        
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        })

        const pdfFile = new File(["content"], "test.pdf", { type: "application/pdf" })
        expect(newBill.isValidFile(pdfFile)).toBe(false)
      })

      test("The it should return false if no file", () => {
        
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        })

        expect(newBill.isValidFile(null)).toBe(false)
      })
    })
  })
})

// TESTS D'INTEGRATION POST

// fonctions utiles plusieurs fois
const expenseType = type => {
  const selectMenu = screen.getByTestId('expense-type')
  userEvent.selectOptions(selectMenu, within(selectMenu).getByRole("option", {name : type}))
  return selectMenu
}
const expenseFile = (fileName, fileType) => {
  const file = new File(['img'], fileName, {type: fileType})
  return file
}

const expenseName     = () => screen.getByTestId('expense-name')
const expenseDate     = () => screen.getByTestId('datepicker')
const expenseAmount   = () => screen.getByTestId('amount')
const expenseVAT      = () => screen.getByTestId('vat')
const expensePCT      = () => screen.getByTestId('pct')
const expenseComment  = () => screen.getByTestId('commentary')


describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    describe("when I fill out the form correctly and click on submit button", () => {
      test("Then the document submission should go through correctly and I should be redirected to the bills page", async () => {
        
        const onNavigate = pathname => {
          document.body.innerHTML = ROUTES({ pathname });
        };

        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        })

        const billData = bills[0] // on se sert de la 1er facture pour envoyer des données à notre test
        const form = screen.getByTestId('form-new-bill')
        const imageInput = screen.getByTestId("file");
        const file = expenseFile(billData.fileName, "image/jpg")

        const validFile = jest.spyOn(newBill, "isValidFile")

        //remplissage simulé des champs

        expenseType(billData.type)
        userEvent.type(expenseName(), billData.name)
        // champs de type date (<input type="date">) sont parfois mal manipulés par userEvent.type() (ici, renvoie "")
        // donc use fireEvent.change pour forcer la bonne valeur de champs
        fireEvent.change(expenseDate(), { target: { value: billData.date } })        
        userEvent.type(expenseAmount(), billData.amount.toString())
        userEvent.type(expenseVAT(), billData.vat)
        userEvent.type(expensePCT(), billData.pct.toString())
        userEvent.type(expenseComment(), billData.commentary)
        
        const handleChangeFile = jest.fn(newBill.handleChangeFile)
        imageInput.addEventListener("change", handleChangeFile)
        
        userEvent.upload(imageInput, file)

        waitFor(() => {
          expect(newBill.fileName).toBe(file.name)
        })        

        // validity = propriété native des éléments de formulaire HTML. 
        // Elle donne un objet ValidityState qui contient plusieurs propriétés comme :
        // valueMissing – true si le champ est requis mais vide.
        expect(expenseType(billData.type).validity.valueMissing).toBe(false)
        expect(expenseDate().value).toBe(billData.date)
        expect(expenseAmount().validity.valueMissing).toBe(false)
        expect(expensePCT().validity.valueMissing).toBe(false)
        expect(validFile(file)).toBeTruthy()

        const submitForm = document.getElementById('btn-send-bill')
        expect(submitForm.type).toBe('submit')

        const handleSubmit = jest.fn(newBill.handleSubmit)
        form.addEventListener('submit', handleSubmit)
        userEvent.click(submitForm)

        expect(handleSubmit).toHaveBeenCalled()

        waitFor(() => expect(screen.getByText(/Mes notes de frais/i)).toBeVisible())
      })
    })

    describe("When I do not fill out the form correctly and click on submit button", () => {
      test("Then the document submission should not go through and I should stay on NewBill page", () => {
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        })

        const newBillForm = screen.getByTestId("form-new-bill")
        const handleSubmit = jest.fn(newBill.handleSubmit)

        newBillForm.addEventListener("submit", handleSubmit)
        fireEvent.submit(newBillForm)

        expect(handleSubmit).toHaveBeenCalled()
        expect(newBillForm).toBeVisible()
      })
    })    
  })
})