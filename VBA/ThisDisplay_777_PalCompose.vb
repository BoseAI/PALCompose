' =====================================================================================
'  Codice VBA del display "777 - PalCompose" (oggetto ThisDisplay)
'  Da incollare al posto del codice esistente in ThisDisplay (Alt+F11 nel display).
'  Richiede Module1.bas aggiornato (WaitMs, NumToText, TextToNum).
' =====================================================================================
Option Explicit

' ===== Configurazione =====
Private Const MAX_BOXES As Integer = 60                       ' posizioni per layer nel PLC
Private Const BACKGROUND_DISPLAY As String = "000 - VBA_code"
Private Const FILE_PATH_JS As String = "C:\IMA\Tools\PalCompose\RuntimeLayerData.js"
Private Const FILE_PATH_CSV As String = "C:\Users\hmioperator\Downloads\RuntimeData.csv"
Private Const BROWSER_URL As String = "file:///C:/IMA/Tools/PalCompose/Index.html"
Private Const CSV_POLL_MS As Long = 500                       ' ogni quanto controllare se la pagina ha salvato

Private Const ROUTINE_NAME As String = "PALCOMPOSE"
Private Const TAG_LAYER_TYPE As String = "Internal_tag\PalCompose\L_St_xLayerType"   ' True = LayerA
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


' Tipo di layer da editare (True = LayerA).
' Se il display di appoggio "000 - VBA_code" e' caricato si usa la sua ReadTag_Any, come prima;
' altrimenti il tag si legge direttamente, senza aprire altri display (necessario nel Test Display di Studio,
' dove FactoryTalk non permette di caricare display).
Private Function ReadLayerTypeIsA() As Boolean
    Dim collLoaded As Displays
    Dim oBg As Object
    Dim i As Integer
    Dim iRetVal As Integer
    Dim xLayerType As Boolean
    Dim sErrorCode As String
    Dim tg As TagGroup
    Dim sl As StringList

    Set collLoaded = LoadedDisplays
    For i = 1 To collLoaded.Count
        If collLoaded.Item(i).Name = BACKGROUND_DISPLAY Then Set oBg = collLoaded.Item(i): Exit For
    Next i
    If Not oBg Is Nothing Then
        iRetVal = oBg.ReadTag_Any("{" & TAG_LAYER_TYPE & "}", xLayerType, sErrorCode)
        ReadLayerTypeIsA = (iRetVal = 4) And (xLayerType <> 0)
        Exit Function
    End If

    On Error GoTo NoTag
    Set tg = Application.CreateTagGroup(Me.AreaName)
    tg.Add TAG_LAYER_TYPE
    tg.Active = True
    If tg.RefreshFromSource(sl) Then ReadLayerTypeIsA = (tg.Item(TAG_LAYER_TYPE).value <> 0)
    Exit Function
NoTag:
    Application.LogDiagnosticsMessage "Routine: " & ROUTINE_NAME & " - tipo layer non leggibile (" & TAG_LAYER_TYPE & "): uso LayerB"
End Function


Private Sub Display_AnimationStart()

    ' --- Dichiarazioni ---
    Dim collLodedDisplayList As Displays
    Dim oBackgroundDisplay As Object
    Dim iRetVal As Integer
    Dim xLayerType As Boolean
    Dim sErrorCode As String
    Dim gLayerComposition As Object
    Dim gLayerCompositionA As Object
    Dim gLayerCompositionB As Object
    Dim runtimeValuesLayer As Object
    Dim jsonData As String
    Dim LayerType As String

    ' --- Oggetti FileSystem ---
    Dim fso As Object
    Dim file As Object
    Dim attempt As Integer

    ' --- Variabili CSV ---
    Dim firstLine As String
    Dim firstFields As Variant
    Dim isSaved As Boolean

    ' --- Layer e Tag ---
    Dim layerAComp As Object
    Dim layerBComp As Object
    Dim tgA As TagGroup
    Dim tgB As TagGroup

    Dim line As String
    Dim fields As Variant
    Dim idx As Long
    Dim boxX As Object
    Dim tgX As TagGroup

    ' --- Altri ---
    Dim ctrl As Object
    Dim i As Integer

    On Error GoTo ErrHandler

    isSaved = False
    Set fso = CreateObject("Scripting.FileSystemObject")

    ' --- Creazione strutture layer ---
    Set gLayerCompositionA = CreateLayerStructure("LayerA")
    Set gLayerCompositionB = CreateLayerStructure("LayerB")

    If ReadLayerTypeIsA() Then
        Set gLayerComposition = gLayerCompositionA
        LayerType = "LayerA"
    Else
        Set gLayerComposition = gLayerCompositionB
        LayerType = "LayerB"
    End If

    ' --- Lettura PLC ---
    ' Se la lettura fallisce non si apre l'editor: si lavorerebbe sui dati del file precedente
    ' e al salvataggio si sovrascriverebbe il PLC con una composizione sbagliata.
    Set runtimeValuesLayer = BuildPalletValues(gLayerComposition, LayerType)
    If runtimeValuesLayer Is Nothing Then GoTo GoBack
    jsonData = ToJSON(runtimeValuesLayer)

    ' --- Scrittura file JS ---
    Set file = fso.CreateTextFile(FILE_PATH_JS, True, False)
    file.WriteLine "const palletData = " & jsonData & ";"
    file.Close
    Set file = Nothing

    ' --- Cancella un eventuale CSV rimasto da una sessione precedente ---
    ' Senza questo il ciclo di attesa lo troverebbe subito e scriverebbe nel PLC dati vecchi;
    ' inoltre il browser salverebbe il nuovo file come "RuntimeData (1).csv" e non verrebbe mai letto.
    If fso.FileExists(FILE_PATH_CSV) Then fso.DeleteFile FILE_PATH_CSV, True

    Set ctrl = Me.Application.ActiveDisplay.FindElement("SEWebBrowserControl1")
    ctrl.url = BROWSER_URL

    ' --- Attesa del salvataggio dalla pagina (senza occupare la CPU) ---
    Do While Not fso.FileExists(FILE_PATH_CSV)
        WaitMs CSV_POLL_MS
    Loop

    ' --- Apertura CSV: il browser potrebbe non averlo ancora rilasciato ---
    For attempt = 1 To 20
        Err.Clear
        On Error Resume Next
        Set file = fso.OpenTextFile(FILE_PATH_CSV, 1)
        On Error GoTo ErrHandler
        If Not file Is Nothing Then Exit For
        WaitMs 100
    Next attempt
    If file Is Nothing Then
        Application.LogDiagnosticsMessage "Routine: " & ROUTINE_NAME & " - impossibile aprire " & FILE_PATH_CSV, ftDiagSeverityError
        GoTo GoBack
    End If

    ' --- Lettura CSV ---
    If Not file.AtEndOfStream Then
        firstLine = file.ReadLine
        firstFields = Split(firstLine, ",")
        If UBound(firstFields) >= 1 Then
            If UCase(Trim(firstFields(1))) = "TRUE" Then isSaved = True
        End If
    End If

    If isSaved Then
        Set layerAComp = gLayerCompositionA("LayerComposition")
        Set layerBComp = gLayerCompositionB("LayerComposition")
        Set tgA = gLayerCompositionA("LayerCompositionTG")
        Set tgB = gLayerCompositionB("LayerCompositionTG")

        If Not file.AtEndOfStream Then file.ReadLine      ' intestazione

        Do While Not file.AtEndOfStream
            line = Trim(file.ReadLine)
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
                            If fields(0) = "LayerA" Then
                                Set tgX = tgA
                                Set boxX = Nothing
                                idx = CLng(TextToNum(fields(1)))
                                If idx >= 1 And idx <= layerAComp("boxes").Count Then Set boxX = layerAComp("boxes")(idx)
                            Else
                                Set tgX = tgB
                                Set boxX = Nothing
                                idx = CLng(TextToNum(fields(1)))
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
        Loop


        Application.LogDiagnosticsMessage "File valido: Saved = TRUE"
    Else
        Application.LogDiagnosticsMessage "File valido: Saved = FALSE"
    End If

    file.Close
    Set file = Nothing

    If fso.FileExists(FILE_PATH_CSV) Then fso.DeleteFile FILE_PATH_CSV, True

GoBack:
    If LayerType = "LayerA" Then
        Application.ExecuteCommand "Display 281 - SizeData_Layer_TypeA_1"
    Else
        Application.ExecuteCommand "Display 291 - SizeData_Layer_TypeB_1"
    End If

    Set collLodedDisplayList = Nothing
    Set oBackgroundDisplay = Nothing
    Exit Sub

ErrHandler:
    Application.LogDiagnosticsMessage "Routine: " & ROUTINE_NAME & " - errore " & Err.Number & ": " & Err.Description, ftDiagSeverityError
    On Error Resume Next
    If Not file Is Nothing Then file.Close
    Resume GoBack

End Sub
