/**
 * @jest-environment jsdom
 */
import {screen, waitFor, within} from "@testing-library/dom"
import '@testing-library/jest-dom'
import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills.js"
import { bills } from "../fixtures/bills.js"
import {ROUTES, ROUTES_PATH} from "../constants/routes.js"
import {localStorageMock} from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import router from "../app/Router.js";
import userEvent from "@testing-library/user-event"
jest.mock("../app/store", () => mockStore)


describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon).toHaveClass("active-icon")
    })

    //test avec erreurs, tel que donné initialement. 
    // expect : des factures triées du plus récent au plus ancien
    // Erreur 1 : voir BillsUI.js, const rows
    // Erreur 2 : Correction de l'intitulé du test 
        // test("Then bills should be ordered from earliest to latest", () => { 
        //   document.body.innerHTML = BillsUI({ data: bills })
        //   const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
        //   const antiChrono = (a, b) => ((a < b) ? 1 : -1) 
        //   const datesSorted = [...dates].sort(antiChrono)
        //   expect(dates).toEqual(datesSorted)
        // })

    // test corrigé : 
    test("Then bills should be ordered from latest to earliest", () => { 
      document.body.innerHTML = BillsUI({ data: bills })

      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const chrono = (a, b) => ((a < b) ? 1 : -1) 
      const datesSorted = [...dates].sort(chrono)
      expect(dates).toEqual(datesSorted)
    })
  })

////////////////////
// RAJOUT DE TESTS//
////////////////////

// test handleClickNewBill
  describe("When I am on Bills Page and click on the new bill button", () => {
    test("Then I should be directed to the form to create a new bill", () => {
      const onNavigate = pathname => {
        document.body.innerHTML = ROUTES({ pathname }) //Fonction de navigation factice. MAJ du contenu de la page HTML avec simulation routage
      }

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      })) // Simulation localStorage et on met utlisateur type Employé pour simuler user connecté

      const bills = new Bills({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      }) // création instance Bills. On lui passe le document, fonction onNavigate, stockage simulé et le localStorage

      document.body.innerHTML = BillsUI({ data: bills }) // injection HTML de BillsUI à qui on envoie les factures

      const newBillBtn = screen.getByTestId('btn-new-bill') // sélectionne le bouton "Nouvelle note de frais"

      expect(newBillBtn).toBeTruthy() // on vérifie l'existence du bouton

      const handleClickNewBill = jest.fn(bills.handleClickNewBill) // on sélection la méthode handleClickNewBill (instance Bills). On veut tester son comportement au clic

      newBillBtn.addEventListener("click", handleClickNewBill)
      userEvent.click(newBillBtn) //similation clic user

       expect(handleClickNewBill).toHaveBeenCalled() // on vérifie que la méthode est bien appelée
    })
  })

//test handleClickIconEye
  describe("When I am on Bills Page and click on the eye icon", () => {
    test("Then a modal should appear", async () => {
      const onNavigate = pathname => {
        document.body.innerHTML = ROUTES({ pathname })
      }

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))

      const billsItem = new Bills({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

      document.body.innerHTML = BillsUI({ data: bills })

      const eyeIcon = screen.getAllByTestId("icon-eye")

      const handleClickIconEye = jest.fn(billsItem.handleClickIconEye)

      const modal = document.getElementById('modaleFile')
      $.fn.modal = jest.fn(() => modal.classList.add("show")) // simuler le comportement Bootstrap

      eyeIcon.forEach(icon => {
        icon.addEventListener("click", () => handleClickIconEye(icon));
        userEvent.click(icon);

        expect(handleClickIconEye).toHaveBeenCalled();
        expect(modal).toHaveClass("show");
      })
    })
  })

//test chargement
  describe("When I went on the bills page and it's loading", () => {
    test("Then loading page should be rendered", () => {
      document.body.innerHTML = BillsUI({ loading: true }) //simule affichage page "Bills" avec option loading: true pour retourner la LoadingPage
      expect(screen.getByText("Loading...")).toBeVisible()
      document.body.innerHTML = ""
    })
  })

//test erreur
  describe("When I am on the bills page but back-end send an error message", () => {
    test("Then error page should be rendered", () => {
      document.body.innerHTML = BillsUI({ error: "error message" })
      expect(screen.getByText("Erreur")).toBeVisible()
      document.body.innerHTML = ""
    })
  })

// GET
  describe("When I navigate to bills page", () => {
    test("fetches bills from mock API GET", async () => {
      Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        })
      localStorage.setItem(
        "user", 
        JSON.stringify({ 
          type: "Employee", 
          email: "a@a" 
        })
      )

      //génération page et vérification présence des éléments une fois chargée
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)

      await waitFor(() => screen.getByText("Mes notes de frais"))

      const newBillBtn = screen.getByTestId('btn-new-bill')
      const billsTableRows = screen.getByTestId("tbody")

      expect(newBillBtn).toBeTruthy();
      expect(billsTableRows).toBeTruthy();
      expect(within(billsTableRows).getAllByRole("row")).toHaveLength(4);
    })

    test("Then bills should be formatted and ordered from latest to earliest", async () => {
      const onNavigate = pathname => {
        document.body.innerHTML = ROUTES({ pathname })
      }

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))

      const billsContainer = new Bills({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
      })

      const billsList = await billsContainer.getBills()

      // vérification ordre antéchronologique et du bon format des dates (formatDate de format.js)
      const dates = billsList.map(bill => bill.date)
      const sortedDates = [...dates].sort((a, b) => new Date(b) - new Date(a))
      expect(dates).toEqual(sortedDates)

      dates.forEach(date => {
        expect(date).toMatch(/^\d{1,2}\s[\p{L}éûîàèÉÎÂÊçÇ]+\.\s\d{2}$/u) //toMatch accepte string ou regex
      })

      // Vérifie les statuts (formatStatus de format.js)
      billsList.forEach(bill => {
        expect(["En attente", "Accepté", "Refusé"]).toContain(bill.status)
      })
    })



    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills")
        Object.defineProperty(
            window,
            'localStorage',
            { value: localStorageMock }
        )
        window.localStorage.setItem('user', JSON.stringify({
          type: 'Employee',
          email: "a@a"
        }))
        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.appendChild(root)
        router()
      })


      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list : () =>  {
              return Promise.reject(new Error("Erreur 404"))
            }
          }})
        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);
        const message = screen.getByText(/Erreur 404/)
        expect(message).toBeTruthy()
      })

      test("fetches messages from an API and fails with 500 message error", async () => {

        mockStore.bills.mockImplementationOnce(() => {
          return {
            list : () =>  {
              return Promise.reject(new Error("Erreur 500"))
            }
          }})

        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);
        const message =  screen.getByText(/Erreur 500/)
        expect(message).toBeTruthy()
      })
    })
  })
})