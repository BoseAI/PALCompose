' =====================================================================================
'  Codice VBA del display "777 - PalCompose" (oggetto ThisDisplay) - VERSIONE ACTIVEX
'  Da usare con il controllo PalCompose.Browser al posto di SEWebBrowserControl1.
'  Il controllo nel display deve chiamarsi PalBrowser1 (Proprieta' -> Name) ed essere
'  esposto al VBA. Nessun file: i dati vanno alla pagina con PageData e il salvataggio
'  torna con l'evento PalBrowser1_MessageReceived.
'  Richiede Module1.bas aggiornato (NumToText, TextToNum).
' =====================================================================================
Option Explicit

' ===== Configurazione =====
Private Const MAX_BOXES As Integer = 60                       ' posizioni per layer nel PLC
Private Const BACKGROUND_DISPLAY As String = "000 - VBA_code"
Private Const APP_FOLDER As String = "C:\Users\IMA-1\Documents\IMA\PalCompose"   ' cartella con Index.html
Private Const START_PAGE As String = "Index.html"

Private Const ROUTINE_NAME As String = "PALCOMPOSE"
' Etichetta ad angolo (1) o laterale (0): solo lettura, passato alla pagina per la visualizzazione
Private Const TAG_CORNER_LABELLING As String = "[clogix]SizeWork.Outfeed.CornerLabelling"


Function CreateLayerStructure(LayerType As String) As Object

    Const LAYER_A_BASE_PICK = 340
    Const LAYER_B_BASE_PICK = 540
    Const LAYER_A_BASE_DEP = 400
    Const LAYER_B_BASE_DEP = 600

    Dim layerStructure As Object: Set layerStructure = CreateObject("Scripting.Dictionary")
    Dim LayerComposition As Object: Set LayerComposition = CreateObject("Scripting.Dictionary")

    Dim boxes As Collection: Set boxes = New Collection

    Dim TG_Layer As TagGroup: Set TG_Layer = Application.CreateTagGroup(Me.AreaName)

    Dim baseRegisterPick As Integer
    Dim baseRegisterDep As Integer
    Dim i As Integer
    Dim box As Object

    TG_Layer.Active = False

    Select Case LayerType
        Case "LayerA"
            baseRegisterPick = LAYER_A_BASE_PICK
            baseRegisterDep = LAYER_A_BASE_DEP
        Case "LayerB"
            baseRegisterPick = LAYER_B_BASE_PICK
            baseRegisterDep = LAYER_B_BASE_DEP
        Case Else
            Application.LogDiagnosticsMessage "LayerType non valido: " & LayerType
            Exit Function
    End Select

    LayerComposition("LayerType") = LayerType
    LayerComposition("NBoxA") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R110": TG_Layer.Add LayerComposition("NBoxA")
    LayerComposition("NBoxB") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R111": TG_Layer.Add LayerComposition("NBoxB")
    LayerComposition("PalletX") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R107": TG_Layer.Add LayerComposition("PalletX")
    LayerComposition("PalletY") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R108": TG_Layer.Add LayerComposition("PalletY")
    LayerComposition("NBoxX") = "[clogix]PAL_SizeDisplayed.NumberBoxIn_X": TG_Layer.Add LayerComposition("NBoxX")
    LayerComposition("NBoxY") = "[clogix]PAL_SizeDisplayed.NumberBoxIn_Y": TG_Layer.Add LayerComposition("NBoxY")
    LayerComposition("OffsetDepositX") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R100": TG_Layer.Add LayerComposition("OffsetDepositX")
    LayerComposition("OffsetDepositY") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R101": TG_Layer.Add LayerComposition("OffsetDepositY")
    LayerComposition("PickType") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R106": TG_Layer.Add LayerComposition("PickType")
    LayerComposition("CaseX") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R124": TG_Layer.Add LayerComposition("CaseX")
    LayerComposition("CaseY") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R125": TG_Layer.Add LayerComposition("CaseY")
    LayerComposition("PickingWheel") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R123": TG_Layer.Add LayerComposition("PickingWheel")
    LayerComposition("NBoxCHA") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R134": TG_Layer.Add LayerComposition("NBoxCHA")
    LayerComposition("NBoxCHB") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R135": TG_Layer.Add LayerComposition("NBoxCHB")
    LayerComposition("ApproachX") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R103": TG_Layer.Add LayerComposition("ApproachX")
    LayerComposition("ApproachY") = "[clogix]PAL_SizeDisplayed.Palletizer.Generals.R104": TG_Layer.Add LayerComposition("ApproachY")
    LayerComposition("CornerLabelling") = TAG_CORNER_LABELLING: TG_Layer.Add LayerComposition("CornerLabelling")

    For i = 1 To MAX_BOXES
        Set box = CreateObject("Scripting.Dictionary")
        box("id") = i
        box("PositionX") = "[clogix]PAL_SizeDisplayed.Palletizer." & LayerType & ".X" & LayerType & "Pos" & i
        box("PositionY") = "[clogix]PAL_SizeDisplayed.Palletizer." & LayerType & ".Y" & LayerType & "Pos" & i
        box("PositionR") = "[clogix]PAL_SizeDisplayed.Palletizer." & LayerType & ".W" & LayerType & "Pos" & i
        box("PickType") = "[clogix]PAL_SizeDisplayed.Palletizer.PickUpType_x_Deposit" & LayerType & ".R" & (baseRegisterPick + i - 1)
        box("DepositType") = "[clogix]PAL_SizeDisplayed.Palletizer.DepositType" & LayerType & ".R" & (baseRegisterDep + i - 1)
        TG_Layer.Add box("PositionX")
        TG_Layer.Add box("PositionY")
        TG_Layer.Add box("PositionR")
        TG_Layer.Add box("PickType")
        TG_Layer.Add box("DepositType")
        boxes.Add box
    Next i

    Set LayerComposition("boxes") = boxes

    TG_Layer.Active = True

    Set layerStructure("LayerComposition") = LayerComposition
    Set layerStructure("LayerCompositionTG") = TG_Layer

    Set CreateLayerStructure = layerStructure

End Function


Function ToJSON(value As Variant) As String

    Dim result As String
    Dim key As Variant
    Dim i As Long

    Select Case TypeName(value)
        Case "Dictionary"
            result = "{"
            For Each key In value.Keys
                result = result & """" & key & """:" & ToJSON(value(key)) & ","
            Next
            If Right(result, 1) = "," Then result = Left(result, Len(result) - 1)
            result = result & "}"
        Case "Collection"
            result = "["
            For i = 1 To value.Count
                result = result & ToJSON(value(i)) & ","
            Next
            If Right(result, 1) = "," Then result = Left(result, Len(result) - 1)
            result = result & "]"
        Case "String"
            result = """" & Replace(Replace(value, "\", "\\"), """", "\""") & """"
        Case "Boolean"
            If value Then result = "true" Else result = "false"
        Case "Byte", "Integer", "Long", "Single", "Double", "Currency", "Decimal", "LongLong"
            result = NumToText(value)            ' sempre con il punto decimale
        Case "Empty", "Null", "Nothing"
            result = "null"
        Case Else
            result = """" & Replace(Replace(CStr(value), "\", "\\"), """", "\""") & """"
    End Select
    ToJSON = result

End Function


' Legge dal PLC i valori del layer. Restituisce Nothing se la lettura non e' riuscita.
Function BuildPalletValues(ByVal layerStructure As Object, LayerType As String) As Object

    Dim palletValues As Object: Set palletValues = CreateObject("Scripting.Dictionary")
    Dim layerComp As Object: Set layerComp = layerStructure("LayerComposition")
    Dim tg As TagGroup: Set tg = layerStructure("LayerCompositionTG")
    Dim key As Variant
    Dim i As Long
    Dim box As Object
    Dim boxVal As Object
    Dim boxesValues As Collection
    Dim bRetVal As Boolean
    Dim slTagsInError As StringList
    Dim sErrorMsg As String
    Dim Nbox As Long
    Dim tagPath As String
    Dim tagItem As Object

    bRetVal = tg.RefreshFromSource(slTagsInError)
    If bRetVal And (slTagsInError Is Nothing) Then
        ' nessuna lista errori restituita: lettura riuscita
    ElseIf bRetVal Then
        If slTagsInError.Count > 0 Then bRetVal = False
    End If

    If Not bRetVal Then
        If Not slTagsInError Is Nothing Then
            For i = 1 To slTagsInError.Count
                If i > 1 Then
                    sErrorMsg = sErrorMsg & ", " & slTagsInError.Item(i)
                Else
                    sErrorMsg = "Routine: " & ROUTINE_NAME & " - 1011. Error Occurred: Variable: " & slTagsInError.Item(i)
                End If
            Next
            sErrorMsg = sErrorMsg & " not correctly updated in tagGroup " & LayerType
        End If
        If sErrorMsg = "" Then
            sErrorMsg = "Routine: " & ROUTINE_NAME & " - 1012. Error Occurred: Problem in updating the tagGroup " & LayerType
        End If
        Application.LogDiagnosticsMessage sErrorMsg, ftDiagSeverityError
        Set BuildPalletValues = Nothing
        Exit Function
    End If

    If LayerType = "LayerA" Then
        Nbox = tg.Item(layerComp("NBoxA")).value
    Else
        Nbox = tg.Item(layerComp("NBoxB")).value
    End If
    If Nbox < 0 Then Nbox = 0
    If Nbox > MAX_BOXES Then
        Application.LogDiagnosticsMessage "Routine: " & ROUTINE_NAME & " - numero casse " & Nbox & " oltre il massimo (" & MAX_BOXES & "), limitato"
        Nbox = MAX_BOXES
    End If

    For Each key In layerComp.Keys
        ' --- BOXES ---
        If TypeName(layerComp(key)) = "Collection" Then
            Set boxesValues = New Collection
            For i = 1 To Nbox
                Set box = layerComp(key)(i)
                Set boxVal = CreateObject("Scripting.Dictionary")
                boxVal("id") = box("id")
                boxVal("PositionX") = tg.Item(box("PositionX")).value
                boxVal("PositionY") = tg.Item(box("PositionY")).value
                boxVal("PositionR") = tg.Item(box("PositionR")).value
                boxVal("PickType") = tg.Item(box("PickType")).value
                boxVal("DepositType") = tg.Item(box("DepositType")).value
                boxesValues.Add boxVal
            Next i
            Set palletValues("boxes") = boxesValues
        ' --- TAG SINGOLI ---
        ElseIf StrComp(key, "LayerType", vbTextCompare) = 0 Then
            palletValues(key) = layerComp(key)
        Else
            tagPath = layerComp(key)
            Set tagItem = Nothing                ' altrimenti resta il tag del giro precedente
            On Error Resume Next
            Set tagItem = tg.Item(tagPath)
            On Error GoTo 0
            If Not tagItem Is Nothing Then
                palletValues(key) = tagItem.value
            Else
                Application.LogDiagnosticsMessage "Tag non trovato: " & key & " -> " & tagPath
            End If
        End If
    Next key

    Set BuildPalletValues = palletValues

End Function


' Scrive il valore di un tag (FactoryTalk View 13 non ha la scrittura a blocchi PendingValue/WritePendingValues)
Private Sub SetTagValue(tg As TagGroup, ByVal tagPath As String, ByVal v As Variant)
    tg.Item(tagPath).value = v
End Sub


' ===== Stato tra apertura display e salvataggio =====
Private mLayerCompositionA As Object
Private mLayerCompositionB As Object
Private mLayerType As String
Private mBusy As Boolean


Private Sub Display_AnimationStart()

    Dim collLodedDisplayList As Displays
    Dim oBackgroundDisplay As Object
    Dim iRetVal As Integer
    Dim xLayerType As Boolean
    Dim sErrorCode As String
    Dim runtimeValuesLayer As Object
    Dim i As Integer

    On Error GoTo ErrHandler
    mBusy = False

    ' --- Recupero display background ---
    Set collLodedDisplayList = LoadedDisplays
    For i = 1 To collLodedDisplayList.Count
        If collLodedDisplayList.Item(i).Name = BACKGROUND_DISPLAY Then
            Set oBackgroundDisplay = collLodedDisplayList.Item(i)
            Exit For
        End If
    Next i
    If oBackgroundDisplay Is Nothing Then
        Set oBackgroundDisplay = Application.ShowDisplay(BACKGROUND_DISPLAY, "/ZA")
    End If

    ' --- Creazione strutture layer (restano in memoria fino al salvataggio) ---
    Set mLayerCompositionA = CreateLayerStructure("LayerA")
    Set mLayerCompositionB = CreateLayerStructure("LayerB")

    iRetVal = oBackgroundDisplay.ReadTag_Any("{Internal_tag\PalCompose\L_St_xLayerType}", xLayerType, sErrorCode)
    If (iRetVal = 4) And (xLayerType <> 0) Then
        mLayerType = "LayerA"
        Set runtimeValuesLayer = BuildPalletValues(mLayerCompositionA, mLayerType)
    Else
        mLayerType = "LayerB"
        Set runtimeValuesLayer = BuildPalletValues(mLayerCompositionB, mLayerType)
    End If

    ' Lettura PLC fallita: non si apre l'editor (si lavorerebbe su dati non validi)
    If runtimeValuesLayer Is Nothing Then GoTo GoBack

    ' --- Dati alla pagina e apertura (nessun file) ---
    PalBrowser1.PageData = ToJSON(runtimeValuesLayer)
    PalBrowser1.LoadApp APP_FOLDER, START_PAGE

    Set collLodedDisplayList = Nothing
    Set oBackgroundDisplay = Nothing
    Exit Sub

ErrHandler:
    Application.LogDiagnosticsMessage "Routine: " & ROUTINE_NAME & " - errore " & Err.Number & ": " & Err.Description, ftDiagSeverityError
    Resume GoBack
GoBack:
    On Error Resume Next
    GoToLayerDisplay
End Sub


' ===== Salvataggio dalla pagina: il testo e' lo stesso CSV che prima finiva in Download =====
Private Sub PalBrowser1_MessageReceived(ByVal message As String)

    Dim lines As Variant
    Dim fields As Variant
    Dim line As String
    Dim n As Long
    Dim idx As Long
    Dim isSaved As Boolean
    Dim layerAComp As Object
    Dim layerBComp As Object
    Dim tgA As TagGroup
    Dim tgB As TagGroup
    Dim tgX As TagGroup
    Dim boxX As Object

    If mBusy Then Exit Sub          ' doppio clic su Salva: il primo messaggio basta
    mBusy = True
    On Error GoTo ErrHandler

    lines = Split(Replace(message, vbCr, ""), vbLf)
    If UBound(lines) >= 0 Then
        fields = Split(lines(0), ",")
        If UBound(fields) >= 1 Then
            If UCase(Trim(fields(1))) = "TRUE" Then isSaved = True
        End If
    End If

    If isSaved And Not (mLayerCompositionA Is Nothing Or mLayerCompositionB Is Nothing) Then
        Set layerAComp = mLayerCompositionA("LayerComposition")
        Set layerBComp = mLayerCompositionB("LayerComposition")
        Set tgA = mLayerCompositionA("LayerCompositionTG")
        Set tgB = mLayerCompositionB("LayerCompositionTG")

        For n = 2 To UBound(lines)                     ' riga 0 = Saved, riga 1 = intestazione
            line = Trim(lines(n))
            If line <> "" Then
                fields = Split(line, ",")
                Select Case fields(0)
                    Case "CommonVariable"
                        If UBound(fields) >= 2 Then
                            If layerAComp.Exists(fields(1)) Then
                                SetTagValue tgA, layerAComp(fields(1)), TextToNum(fields(2))
                            Else
                                Application.LogDiagnosticsMessage "Tag non trovato CommonVariable: " & fields(1)
                            End If
                        End If

                    Case "LayerA", "LayerB"
                        If UBound(fields) >= 6 Then
                            Set boxX = Nothing
                            idx = CLng(TextToNum(fields(1)))
                            If fields(0) = "LayerA" Then
                                Set tgX = tgA
                                If idx >= 1 And idx <= layerAComp("boxes").Count Then Set boxX = layerAComp("boxes")(idx)
                            Else
                                Set tgX = tgB
                                If idx >= 1 And idx <= layerBComp("boxes").Count Then Set boxX = layerBComp("boxes")(idx)
                            End If
                            If Not boxX Is Nothing Then
                                SetTagValue tgX, boxX("PositionX"), TextToNum(fields(2))
                                SetTagValue tgX, boxX("PositionY"), TextToNum(fields(3))
                                SetTagValue tgX, boxX("PositionR"), TextToNum(fields(4))
                                SetTagValue tgX, boxX("PickType"), TextToNum(fields(5))
                                SetTagValue tgX, boxX("DepositType"), TextToNum(fields(6))
                            Else
                                Application.LogDiagnosticsMessage "Routine: " & ROUTINE_NAME & " - indice cassa fuori range: " & line
                            End If
                        End If
                End Select
            End If
        Next n

        Application.LogDiagnosticsMessage "Salvataggio PalCompose: Saved = TRUE"
    Else
        Application.LogDiagnosticsMessage "Salvataggio PalCompose: Saved = FALSE"
    End If

GoBack:
    On Error Resume Next
    GoToLayerDisplay
    Exit Sub

ErrHandler:
    Application.LogDiagnosticsMessage "Routine: " & ROUTINE_NAME & " - errore salvataggio " & Err.Number & ": " & Err.Description, ftDiagSeverityError
    Resume GoBack
End Sub


Private Sub PalBrowser1_BrowserError(ByVal description As String)
    Application.LogDiagnosticsMessage "Routine: " & ROUTINE_NAME & " - browser: " & description, ftDiagSeverityError
End Sub


Private Sub GoToLayerDisplay()
    If mLayerType = "LayerA" Then
        Application.ExecuteCommand "Display 281 - SizeData_Layer_TypeA_1"
    Else
        Application.ExecuteCommand "Display 291 - SizeData_Layer_TypeB_1"
    End If
End Sub
