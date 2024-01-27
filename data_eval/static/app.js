// Global variable to store the current index
let current_index = instance_index;
// Fetch the initial model outputs based on the instance index
rendere_instance(current_index);

// Fetch the model outputs from the API and update the UI 
async function rendere_instance(index) {
    const response = await fetch(`/api/model-outputs/${index}`);
    const data = await response.json(); 
    // data.history: [{"role": "user/assistant ...", }, ...]
    // data.completions: "ground truth completion"
    console.log("Data received:")
    console.log(data)

    // if the response is error, show the out of range message
    if (data.error == "Index out of range") {
        show_alert(
            "You requested an out-of-range instance. You might have completed all the evaluations. Thank you for your contribution!", 
            "danger",
            insert_after_selector="#instance-info",
            timeout=1e10 // set timeout to a very large number so that the alert doesn't disappear
        );
        clear_all();
        return;
    }

    clear_all();
    $("#instance-id").html(`Instance ${index}`);
    var messages = data.history;
    var history_message_region = $("#history-message-region");
    history_message_region.empty();

    completion_a = data.completions;
    // console.log(data.completions)

    // Save history messages to element `history_message_region`
    history_message_region.attr("history-messages", JSON.stringify(messages));

    let comp_a_element_list = resolveMedia(completion_a); 
    let completion_a_str = generateMediaString(comp_a_element_list, 'compA');  // generate compAImage, compAAudio, compAVideo

    $.each(messages, function(i, message) {
        // console.log(message)
        let prompt_element_list = resolveMedia(message.message); 
        // console.log("prompt_element_list content:")
        // console.log(prompt_element_list)
        // Generate historyImage0/1/2/3... , historyAudio0/1/2/3... , historyVideo0/1/2/3...
        let history_str = generateMediaString(prompt_element_list, 'history', i);  
        // console.log("history_str:")
        // console.log(history_str)

        var icon = message.role == "user" ? "🧑" : "🤖";
        var $message_element = $("<div></div>").addClass("row").html(`
            <div class="col icon-col">
                <button class="role-icon">${icon}</button>
            </div>
            <div class="col message-col history-message-col">
                <div>
                    ${history_str}
                </div>
            </div>
        `);
        
        history_message_region.append($message_element);
        
        // Link media to elements(historyImage, historyAudio, historyVideo)
        handleElementClick("historyImage"+i, prompt_element_list);  
        handleElementClick("historyAudio"+i, prompt_element_list);
        handleElementClick("historyVideo"+i, prompt_element_list);
        
    });
    // Store completion string to the element
    $("#completion-A-col").attr("data-completion", completion_a);

    $("#completion-A-col").html(`
    <div id="ground-truth-completion">  
        ${completion_a_str}
    </div>
    `);
    // console.log("The structure of completion-A: ")
    // console.log($("#completion-A-col"))

    // Link media to elements(compAImage, compAAudio, compAVideo)
    handleElementClick('compAImage', comp_a_element_list);
    handleElementClick('compAAudio', comp_a_element_list);
    handleElementClick('compAVideo', comp_a_element_list);
    

    $('#myModal').on('hidden.bs.modal', function (e) {
        $('.modal-body').empty(); // Clear the media display 
    });
    
    $('#modalClose').on('click', function(e) {
        $('#myModal').modal('hide');
    });

    // Change the URL path with the current index
    window.history.pushState(null, '', `/instances/${index}`);
}


function generateMediaString(mediaArray, identifierPrefix, element_index = '') {
    let mediaStr = '';
    let count = { 'Image': 0, 'Video': 0, 'Audio': 0 };

    $.each(mediaArray, (index, item) => {
        if (item.type === 'Text') {
            mediaStr += `<xmp class="message-text"">${item.content}</xmp>`;
        }

        if (item.type === 'Image' || item.type === 'Video' || item.type === 'Audio') {
            count[item.type]++;
            let emoji;
            switch (item.type) {
                case 'Image':
                    emoji = '🖼️';
                    break;
                case 'Audio':
                    emoji = '🔈';
                    break;
                case 'Video':
                    emoji = '🎬';
                    break;
            }
            let mediaName = `[${emoji} ${item.type} ${count[item.type]}]`;
            let idOrClass = `class="${identifierPrefix}${item.type}${element_index}" data-index="${index}"`;
            mediaStr += `<span ${idOrClass} data-clicked="false">${mediaName}</span>`;
        }
        
    });

    return mediaStr;
}


function handleElementClick(elementType, elementList) {
    // console.log("elementType received")
    // console.log(elementType)
    // console.log("elementList")
    // console.log(elementList)

    $(`.${elementType}`).each((index, item) => {
        $(item).on("click", function() {
            $(this).data('clicked', true);
            // console.log("Click Detected");
            // console.log($(this).data('clicked'));
            $(this).css('background-color', '#ef7809');
            let key = $(item).attr('data-index');  // find index in elementList
            let strHtml = '';
            if (elementType.includes('Image')) {
                strHtml = `<image src='${elementList[key].content}' class="role-image" />`;
            } else if (elementType.includes('Audio')) {
                strHtml = `
                    <audio controls autoplay>
                        <source src="${elementList[key].content}" type="audio/mp4">
                        <source src="${elementList[key].content}" type="audio/mpeg">
                        <source src="${elementList[key].content}" type="audio/ogg">
                        Audio element is not supported on your browser
                    </audio>`;
            } else if (elementType.includes('Video')) {
                strHtml = `
                    <video controls autoplay style="width:100%; height:100%; object-fit: fill">
                        <source src="${elementList[key].content}" type="video/mp4">
                        <source src="${elementList[key].content}" type="video/mpeg">
                        <source src="${elementList[key].content}" type="video/ogg">
                        Video element is not supported on your browser
                    </video>`;
            }
            $('#myModal').modal('show');
            $('.modal-body').html(strHtml);
        });
    });
}


function resolveMedia(htmlStr) {
    // console.log(htmlStr);
    let htmlData = [];
    const newHtmlData = htmlStr.match(/<([a-z][a-z0-9]*)\b[^>]*>([\s\S]*?)<\/[\s]*\1[^>]*>/g); 
    // console.log(newHtmlData);
    newHtmlData.map((item, index) => {
        if(item.indexOf('<text>') !== -1) {
            htmlData.push({
                content:item?.replace(/<text>/,'')?.replace(/<\/text>/,''),
                type:'Text'
            })
        }
        if(item.indexOf('<image>') !== -1) {
            let handleItem = item.replace(/<image>/,'').replace(/<\/image>/,'');
            let fileName = handleItem.match(/.*\/([^\/]*?)(?=\.|$).*/)[1]; 
            htmlData.push({
                name:fileName,
                content:handleItem,
                type:'Image'
            })
        }
        if(item.indexOf('<audio>') !== -1) {
            let handleItem = item.replace(/<audio>/,'').replace(/<\/audio>/,'');
            let fileName = handleItem.match(/.*\/([^\/]*?)(?=\.|$).*/)[1];
            htmlData.push({
                name:fileName,
                content:handleItem,
                type:'Audio'
            })
        }
        if(item.indexOf('<video>') !== -1) {
            let handleItem = item.replace(/<video>/,'').replace(/<\/video>/,'');
            let fileName = handleItem.match(/.*\/([^\/]*?)(?=\.|$).*/)[1]; 
            htmlData.push({
                name:fileName,
                content:handleItem,
                type:'Video'
            })
        }
        
    })
    return htmlData;
}

// clear everything
function clear_all() {
    $('#history-message-region').html(`
        <div class="row">
            <div class="col icon-col">
                <button class="role-icon">🧑</button>
            </div>
            <div class="col message-col history-message-col">
                <xmp class="message-text"></xmp>
            </div>
        </div>
    `);
    $('.completion-col').empty(); 
    $('input[type="checkbox"], input[type="radio"]').prop('checked', false);
    $('textarea').val('');
}


function show_alert(message, type, insert_after_selector, timeout=5000) {
    const alert_container = $(`<div class="alert alert-${type} mx-auto mt-2" style="max-width:500px" role="alert">${message}</div>`)[0];
    $(insert_after_selector)[0].insertAdjacentElement("afterend", alert_container);
    setTimeout(() => {
        alert_container.remove();
    }, timeout);
}

async function submit_evaluation() {
    try {
        const inst_is_acceptable = $("input[name='inst-is-acceptable']:checked").val();
        const inst_no_reason = $("textarea[name='inst_no_reason']").val();

        const label_is_acceptable = $("input[name='label-is-acceptable']:checked").val();
        const label_no_reason = $("textarea[name='label_no_reason']").val();
        
        // get the prompt and completions
        const prompt = $("#history-message-region").attr("history-messages");
        const ground_truth = $("#completion-A-col").attr("data-completion");

        let allmediaClicked = $('[class*="Image"], [class*="Audio"], [class*="Video"]').get().every(function(element) {
            return $(element).data('clicked');
        });
        // make sure some fields are filled
        if (inst_is_acceptable == "no" && inst_no_reason == "") {
            show_alert("Please ensure that the reason for choosing 'No' in Q1 is entered.", "danger", insert_after_selector="#evaluation-submit", timeout=5000);
            return;
        }
        if (label_is_acceptable == "no" && label_no_reason == "") {
            show_alert("Please ensure that the reason for choosing 'No' in Q2 is entered.", "danger", insert_after_selector="#evaluation-submit", timeout=5000);
            return;
        }
        // console.log('allmediaClicked')
        // console.log(allmediaClicked)
        if (!allmediaClicked) {
            show_alert("Please interact with all media elements (images, audios, and videos) before submitting.", "danger", insert_after_selector="#evaluation-submit", timeout=5000);
            return;
        }
        // make sure all the required fields are filled
        if (inst_is_acceptable == undefined || label_is_acceptable == undefined) {
            show_alert("Please fill in all the questions.", "danger", insert_after_selector="#evaluation-submit", timeout=5000);
            return;
        }
        const response = await fetch("/api/submit-evaluation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                index: current_index,
                prompt,
                ground_truth,
                inst_is_acceptable,
                inst_no_reason,
                label_is_acceptable,
                label_no_reason,
                evaluator: username 
            }),
        });
        
        // if the response is 200, show the success message
        if (response.status == 200) {
            show_alert("Evaluation data is submitted successfully.", "success", insert_after_selector="#evaluation-submit", timeoutput=5000);
            console.log("Evaluation data is submitted successfully.");
            current_index++;
            rendere_instance(current_index);
        }
        else if (response.status == 401) {
            show_alert("You need to log in to submit evaluation data.", "danger", insert_after_selector="#evaluation-submit", timeoutput=5000);
        }
        else {
            // console.log(response);
            show_alert("Error when submitting evaluation data. Please try again.", "danger", insert_after_selector="#evaluation-submit", timeoutput=5000);
            console.error("Error when submitting evaluation data:", response.status);
        }
    } catch (error) {
        show_alert("Error when submitting evaluation data. Please try again.", "danger", insert_after_selector="#evaluation-submit", timeoutput=5000);
        console.error("Error when submitting evaluation data:", error);
    }
}

$("#evaluation-submit").click(function () {
    // prevent default form submission
    event.preventDefault();
    submit_evaluation();
});

// Add event listeners for the navigation buttons
$('#prev-button').click(function () {
    if (current_index > 0) {
        // redirect to the previous instance using url
        window.location.href = `/instances/${current_index - 1}`;
    } else {
        show_alert("You are already on the first instance.", "danger");
    }
});

$("#next-button").click(function () {
    // redirect to the next instance using url
    window.location.href = `/instances/${current_index + 1}`;
});